
const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.static(path.join(__dirname, "public")));

// DATABASE
function readData() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        { users: [], posts: [], follows: [], passwords: {} },
        null,
        2
      )
    );
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

  data.users = data.users || [];
  data.posts = data.posts || [];
  data.follows = data.follows || [];
  data.passwords = data.passwords || {};

  return data;
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function cleanName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 25);
}

// SIGNUP
app.post("/api/signup", async (req, res) => {
  try {
    const username = cleanName(req.body.username);
    const password = String(req.body.password || "");

    if (username.length < 2) {
      return res.status(400).json({
        error: "Username must contain at least 2 characters."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must contain at least 6 characters."
      });
    }

    const data = readData();

    const existingUser = data.users.find(
      user => user.toLowerCase() === username.toLowerCase()
    );

    if (existingUser) {
      return res.status(409).json({
        error: "Username already exists. Please login."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    data.users.push(username);
    data.passwords[username.toLowerCase()] = hashedPassword;

    saveData(data);

    res.status(201).json({
      message: "Account created successfully!",
      username
    });
  } catch (error) {
    res.status(500).json({ error: "Signup failed." });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const username = cleanName(req.body.username);
    const password = String(req.body.password || "");

    const data = readData();

    const user = data.users.find(
      item => item.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        error: "Account not found. Please sign up."
      });
    }

    const storedPassword = data.passwords[user.toLowerCase()];

    if (!storedPassword) {
      return res.status(401).json({
        error: "This account has no password. Please sign up again."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      storedPassword
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Incorrect password."
      });
    }

    res.json({
      username: user,
      message: "Login successful!"
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed." });
  }
});

// GET POSTS
app.get("/api/posts", (req, res) => {
  const data = readData();
  const viewer = String(req.query.viewer || "").toLowerCase();

  const visiblePosts = data.posts
    .filter(post => {
      if (post.visibility !== "followers") return true;

      if (post.author.toLowerCase() === viewer) return true;

      return data.follows.some(
        follow =>
          follow.from.toLowerCase() === viewer &&
          follow.to.toLowerCase() === post.author.toLowerCase()
      );
    })
    .map(post => {
      const likes = post.likes || [];

      return {
        ...post,
        likeCount: likes.length,
        likedByMe: likes.some(
          user => user.toLowerCase() === viewer
        )
      };
    });

  res.json({ posts: visiblePosts });
});

// CREATE POST
app.post("/api/posts", (req, res) => {
  const author = cleanName(req.body.author);
  const content = String(req.body.content || "").trim();
  const visibility =
    req.body.visibility === "followers" ? "followers" : "public";

  if (!author || !content) {
    return res.status(400).json({
      error: "Author and post content are required."
    });
  }

  if (content.length > 500) {
    return res.status(400).json({
      error: "Post cannot exceed 500 characters."
    });
  }

  const data = readData();

  const post = {
    id: Date.now().toString(),
    author,
    content,
    visibility,
    likes: [],
    createdAt: new Date().toLocaleString()
  };

  data.posts.unshift(post);
  saveData(data);

  res.status(201).json({ post });
});

// LIKE / UNLIKE
app.post("/api/posts/:id/like", (req, res) => {
  const username = cleanName(req.body.username);
  const data = readData();

  const post = data.posts.find(
    item => item.id === req.params.id
  );

  if (!post) {
    return res.status(404).json({ error: "Post not found." });
  }

  post.likes = post.likes || [];

  if (post.author.toLowerCase() === username.toLowerCase()) {
    return res.status(400).json({
      error: "You cannot like your own post."
    });
  }

  const alreadyLiked = post.likes.some(
    user => user.toLowerCase() === username.toLowerCase()
  );

  if (alreadyLiked) {
    post.likes = post.likes.filter(
      user => user.toLowerCase() !== username.toLowerCase()
    );
  } else {
    post.likes.push(username);
  }

  saveData(data);

  res.json({
    likeCount: post.likes.length,
    likedByMe: !alreadyLiked
  });
});

// GET USERS
app.get("/api/users", (req, res) => {
  const data = readData();
  res.json({ users: data.users });
});

// GET FOLLOWING
app.get("/api/following", (req, res) => {
  const username = cleanName(req.query.username).toLowerCase();
  const data = readData();

  const following = data.follows
    .filter(item => item.from.toLowerCase() === username)
    .map(item => item.to);

  res.json({ following });
});

// GET FOLLOWERS
app.get("/api/followers", (req, res) => {
  const username = cleanName(req.query.username).toLowerCase();
  const data = readData();

  const followers = data.follows
    .filter(item => item.to.toLowerCase() === username)
    .map(item => item.from);

  res.json({ followers });
});

// FOLLOW / UNFOLLOW
app.post("/api/follow", (req, res) => {
  const from = cleanName(req.body.from);
  const to = cleanName(req.body.to);

  if (!from || !to) {
    return res.status(400).json({
      error: "Both usernames are required."
    });
  }

  if (from.toLowerCase() === to.toLowerCase()) {
    return res.status(400).json({
      error: "You cannot follow yourself."
    });
  }

  const data = readData();

  const targetExists = data.users.some(
    user => user.toLowerCase() === to.toLowerCase()
  );

  if (!targetExists) {
    return res.status(404).json({
      error: "User not found."
    });
  }

  const alreadyFollowing = data.follows.some(
    item =>
      item.from.toLowerCase() === from.toLowerCase() &&
      item.to.toLowerCase() === to.toLowerCase()
  );

  if (alreadyFollowing) {
    data.follows = data.follows.filter(
      item =>
        !(
          item.from.toLowerCase() === from.toLowerCase() &&
          item.to.toLowerCase() === to.toLowerCase()
        )
    );
  } else {
    data.follows.push({ from, to });
  }

  saveData(data);

  res.json({
    following: !alreadyFollowing,
    message: alreadyFollowing ? "Unfollowed." : "Following."
  });
});

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Micro Blog API is running!"
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Micro Blog server running on port ${PORT}`);
});

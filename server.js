
const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data.json");

// Middleware
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

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Database functions
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

// Helpers
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
    res.status(500).json({
      error: "Signup failed."
    });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const username = cleanName(req.body.username);
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        error: "Enter username and password."
      });
    }

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
        error: "This account has no password. Please sign up with a new username."
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
    res.status(500).json({
      error: "Login failed."
    });
  }
});

// GET ALL POSTS
app.get("/api/posts", (req, res) => {
  const data = readData();

  const posts = data.posts.map(post => ({
    ...post,
    likes: post.likes || []
  }));

  res.json(posts);
});

// CREATE POST
app.post("/api/posts", (req, res) => {
  const username = cleanName(req.body.username);
  const content = String(req.body.content || "").trim();

  if (!username || !content) {
    return res.status(400).json({
      error: "Username and post content are required."
    });
  }

  const data = readData();

  const post = {
    id: Date.now().toString(),
    username,
    content,
    likes: [],
    createdAt: new Date().toISOString()
  };

  data.posts.unshift(post);
  saveData(data);

  res.status(201).json(post);
});

// LIKE / UNLIKE POST
app.post("/api/posts/:id/like", (req, res) => {
  const username = cleanName(req.body.username);

  if (!username) {
    return res.status(400).json({
      error: "Username is required."
    });
  }

  const data = readData();

  const post = data.posts.find(
    item => item.id === req.params.id
  );

  if (!post) {
    return res.status(404).json({
      error: "Post not found."
    });
  }

  post.likes = post.likes || [];

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
    message: alreadyLiked ? "Like removed." : "Post liked.",
    likes: post.likes
  });
});

// GET ALL USERS
app.get("/api/users", (req, res) => {
  const data = readData();
  res.json(data.users);
});

// GET FOLLOWING
app.get("/api/following", (req, res) => {
  const username = cleanName(req.query.username);

  const data = readData();

  const following = data.follows
    .filter(item => item.from.toLowerCase() === username.toLowerCase())
    .map(item => item.to);

  res.json(following);
});

// GET FOLLOWERS
app.get("/api/followers", (req, res) => {
  const username = cleanName(req.query.username);

  const data = readData();

  const followers = data.follows
    .filter(item => item.to.toLowerCase() === username.toLowerCase())
    .map(item => item.from);

  res.json(followers);
});

// FOLLOW / UNFOLLOW USER
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

  const targetUserExists = data.users.some(
    user => user.toLowerCase() === to.toLowerCase()
  );

  if (!targetUserExists) {
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
    message: alreadyFollowing ? "Unfollowed." : "Following.",
    following: !alreadyFollowing
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

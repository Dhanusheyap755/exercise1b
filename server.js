const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readData() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], posts: [], follows: [] }, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  data.users = data.users || [];
  data.posts = data.posts || [];
  data.follows = data.follows || [];
  return data;
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 25);
}

app.post("/api/login", (req, res) => {
  const username = cleanName(req.body.username);
  if (username.length < 2) {
    return res.status(400).json({ error: "Enter a name with at least 2 characters." });
  }
  const data = readData();
  let user = data.users.find(u => u.toLowerCase() === username.toLowerCase());
  if (!user) {
    data.users.push(username);
    saveData(data);
    user = username;
  }
  res.json({ username: user });
});

app.get("/api/posts", (req, res) => {
  const data = readData();
  const viewer = cleanName(req.query.viewer);
  const posts = data.posts
    .filter(post => {
      if (post.visibility === "public") return true;
      if (post.author.toLowerCase() === viewer.toLowerCase()) return true;
      return data.follows.some(f =>
        f.from.toLowerCase() === viewer.toLowerCase() &&
        f.to.toLowerCase() === post.author.toLowerCase()
      );
    })
    .slice()
    .reverse()
    .map(post => ({
      ...post,
      visibility: post.visibility || "public",
      likeCount: post.likes.length,
      likedByMe: post.likes.some(name => name.toLowerCase() === viewer.toLowerCase())
    }));
  res.json({ posts });
});

app.post("/api/posts", (req, res) => {
  const author = cleanName(req.body.author);
  const content = String(req.body.content || "").trim();
  const visibility = req.body.visibility === "followers" ? "followers" : "public";
  if (!author) return res.status(400).json({ error: "Please log in first." });
  if (!content) return res.status(400).json({ error: "Write something before posting." });
  if (content.length > 500) return res.status(400).json({ error: "Post must be under 500 characters." });

  const data = readData();
  const post = {
    id: Date.now().toString(),
    author,
    content,
    visibility,
    createdAt: new Date().toLocaleString(),
    likes: []
  };
  data.posts.push(post);
  saveData(data);
  res.json({ post });
});

app.post("/api/posts/:id/like", (req, res) => {
  const username = cleanName(req.body.username);
  const data = readData();
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  if (!username) return res.status(400).json({ error: "Please log in first." });
  if (post.author.toLowerCase() === username.toLowerCase()) {
    return res.status(400).json({ error: "You cannot like your own post." });
  }
  const index = post.likes.findIndex(name => name.toLowerCase() === username.toLowerCase());
  if (index === -1) post.likes.push(username);
  else post.likes.splice(index, 1);
  saveData(data);
  res.json({ success: true });
});

app.get("/api/users", (req, res) => {
  const data = readData();
  res.json({ users: data.users });
});

app.get("/api/following", (req, res) => {
  const data = readData();
  const username = cleanName(req.query.username);
  const following = data.follows
    .filter(item => item.from.toLowerCase() === username.toLowerCase())
    .map(item => item.to);
  res.json({ following });
});

app.get("/api/followers", (req, res) => {
  const data = readData();
  const username = cleanName(req.query.username);
  const followers = data.follows
    .filter(item => item.to.toLowerCase() === username.toLowerCase())
    .map(item => item.from);
  res.json({ followers });
});

app.post("/api/follow", (req, res) => {
  const from = cleanName(req.body.from);
  const to = cleanName(req.body.to);
  if (!from || !to) return res.status(400).json({ error: "Missing username." });
  if (from.toLowerCase() === to.toLowerCase()) {
    return res.status(400).json({ error: "You cannot follow yourself." });
  }
  const data = readData();
  const exists = data.follows.some(item =>
    item.from.toLowerCase() === from.toLowerCase() &&
    item.to.toLowerCase() === to.toLowerCase()
  );
  if (exists) {
    data.follows = data.follows.filter(item =>
      !(item.from.toLowerCase() === from.toLowerCase() &&
        item.to.toLowerCase() === to.toLowerCase())
    );
  } else {
    data.follows.push({ from, to });
  }
  saveData(data);
  res.json({ success: true, following: !exists });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  readData();
  console.log("Micro Blog running at http://localhost:" + PORT);
});

const currentUser = localStorage.getItem("microBlogUser");
const currentUserEl = document.getElementById("currentUser");
const logoutBtn = document.getElementById("logoutBtn");
const postForm = document.getElementById("postForm");
const postText = document.getElementById("postText");
const charCount = document.getElementById("charCount");
const feed = document.getElementById("feed");
const message = document.getElementById("message");
const refreshBtn = document.getElementById("refreshBtn");
const people = document.getElementById("people");
const peopleBtn = document.getElementById("peopleBtn");
const followingList = document.getElementById("followingList");
const followersList = document.getElementById("followersList");

if (!currentUser) window.location.href = "index.html";
currentUserEl.textContent = currentUser || "";

function showMessage(text) {
  message.textContent = text || "";
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

logoutBtn.addEventListener("click", function () {
  localStorage.removeItem("microBlogUser");
  window.location.href = "index.html";
});

postText.addEventListener("input", function () {
  charCount.textContent = postText.value.length + " / 500";
});

postForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  const visibility = document.querySelector('input[name="visibility"]:checked').value;
  try {
    await request("https://exercise1b.onrender.com/api/posts", {
      method: "POST",
      body: JSON.stringify({
        author: currentUser,
        content: postText.value,
        visibility: visibility
      })
    });
    postText.value = "";
    charCount.textContent = "0 / 500";
    showMessage("Post added.");
    await loadPosts();
  } catch (err) {
    showMessage(err.message);
  }
});

refreshBtn.addEventListener("click", loadPosts);
peopleBtn.addEventListener("click", loadPeople);

async function loadPosts() {
  try {
    const data = await request("https://exercise1b.onrender.com/api/posts?viewer=" + encodeURIComponent(currentUser));
    feed.innerHTML = "";
    if (data.posts.length === 0) {
      feed.textContent = "No posts yet.";
      return;
    }

    data.posts.forEach(function (post) {
      const card = document.createElement("article");
      card.className = "post";

      const title = document.createElement("h3");
      title.textContent = "@" + post.author;

      const date = document.createElement("p");
      date.className = "hint";
      date.textContent = post.createdAt;

      const visibility = document.createElement("p");
      visibility.className = "visibility-label";
      visibility.textContent = post.visibility === "followers" ? "👥 Followers only" : "🌍 Public";

      const content = document.createElement("p");
      content.className = "post-content";
      content.textContent = post.content;

      const likeButton = document.createElement("button");
      likeButton.className = "small-button";
      likeButton.textContent = (post.likedByMe ? "Unlike" : "Like") + " (" + post.likeCount + ")";
      likeButton.disabled = post.author.toLowerCase() === currentUser.toLowerCase();

      likeButton.addEventListener("click", async function () {
        try {
          await request("https://exercise1b.onrender.com/api/posts/" + post.id + "/like", {
            method: "POST",
            body: JSON.stringify({ username: currentUser })
          });
          await loadPosts();
        } catch (err) {
          showMessage(err.message);
        }
      });

      card.append(title, date, visibility, content, likeButton);
      feed.appendChild(card);
    });
  } catch (err) {
    showMessage(err.message);
  }
}

async function loadPeople() {
  try {
    const result = await request("https://exercise1b.onrender.com/api/users");
    const followResult = await request("https://exercise1b.onrender.com/api/following?username=" + encodeURIComponent(currentUser));
    const following = followResult.following.map(name => name.toLowerCase());
    people.innerHTML = "";

    const others = result.users.filter(name => name.toLowerCase() !== currentUser.toLowerCase());
    if (others.length === 0) {
      people.textContent = "No other users yet. Ask your friend to log in once.";
    } else {
      others.forEach(function (name) {
        const row = document.createElement("div");
        row.className = "person-row";
        const label = document.createElement("span");
        label.textContent = name;
        const button = document.createElement("button");
        button.className = "small-button";
        button.textContent = following.includes(name.toLowerCase()) ? "Following" : "Follow";

        button.addEventListener("click", async function () {
          try {
            await request("https://exercise1b.onrender.com/api/follow", {
              method: "POST",
              body: JSON.stringify({ from: currentUser, to: name })
            });
            await loadPeople();
            await loadPosts();
          } catch (err) {
            showMessage(err.message);
          }
        });
        row.append(label, button);
        people.appendChild(row);
      });
    }

    const followingData = await request("https://exercise1b.onrender.com/api/following?username=" + encodeURIComponent(currentUser));
    const followersData = await request("https://exercise1b.onrender.com/api/followers?username=" + encodeURIComponent(currentUser));
    showNames(followingList, followingData.following, "You are not following anyone yet.");
    showNames(followersList, followersData.followers, "You do not have any followers yet.");
  } catch (err) {
    showMessage(err.message);
  }
}

function showNames(container, names, emptyText) {
  container.innerHTML = "";
  if (!names.length) {
    container.textContent = emptyText;
    return;
  }
  names.forEach(function (name) {
    const item = document.createElement("p");
    item.className = "person-name";
    item.textContent = name;
    container.appendChild(item);
  });
}

loadPosts();
loadPeople();

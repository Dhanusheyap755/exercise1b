
const API_URL = "https://exercise1b.onrender.com";

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

// LOGIN CHECK
if (!currentUser) {
  window.location.href = "index.html";
}

if (currentUserEl) {
  currentUserEl.textContent = currentUser || "";
}

// MESSAGE
function showMessage(text) {
  if (message) {
    message.textContent = text || "";
  }
}

// API REQUEST
async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

// LOGOUT
if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("microBlogUser");
    window.location.href = "index.html";
  });
}

// CHARACTER COUNT
if (postText && charCount) {
  postText.addEventListener("input", function () {
    charCount.textContent = postText.value.length + " / 500";
  });
}

// CREATE POST
if (postForm) {
  postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const selectedVisibility = document.querySelector(
      'input[name="visibility"]:checked'
    );

    const visibility = selectedVisibility
      ? selectedVisibility.value
      : "public";

    const content = postText.value.trim();

    if (!content) {
      showMessage("Enter something to post.");
      return;
    }

    try {
      await request(API_URL + "/api/posts", {
        method: "POST",
        body: JSON.stringify({
          author: currentUser,
          content: content,
          visibility: visibility
        })
      });

      postText.value = "";

      if (charCount) {
        charCount.textContent = "0 / 500";
      }

      showMessage("Post added successfully!");

      await loadPosts();

    } catch (error) {
      showMessage(error.message);
    }
  });
}

// REFRESH BUTTONS
if (refreshBtn) {
  refreshBtn.addEventListener("click", loadPosts);
}

if (peopleBtn) {
  peopleBtn.addEventListener("click", loadPeople);
}

// LOAD POSTS
async function loadPosts() {
  try {
    const data = await request(
      API_URL + "/api/posts?viewer=" + encodeURIComponent(currentUser)
    );

    const posts = Array.isArray(data)
      ? data
      : Array.isArray(data.posts)
        ? data.posts
        : [];

    feed.innerHTML = "";

    if (posts.length === 0) {
      feed.textContent = "No posts yet.";
      return;
    }

    posts.forEach(function (post) {
      const card = document.createElement("article");
      card.className = "post";

      const title = document.createElement("h3");
      title.textContent = "@" + (post.author || post.username || "Unknown");

      const date = document.createElement("p");
      date.className = "hint";
      date.textContent = post.createdAt || "";

      const visibility = document.createElement("p");
      visibility.className = "visibility-label";

      visibility.textContent =
        post.visibility === "followers"
          ? "👥 Followers only"
          : "🌍 Public";

      const content = document.createElement("p");
      content.className = "post-content";
      content.textContent = post.content || "";

      const likeButton = document.createElement("button");
      likeButton.className = "small-button";

      const likeCount = post.likeCount ??
        (Array.isArray(post.likes) ? post.likes.length : 0);

      likeButton.textContent =
        (post.likedByMe ? "Unlike" : "Like") +
        " (" + likeCount + ")";

      likeButton.disabled =
        (post.author || post.username || "").toLowerCase() ===
        currentUser.toLowerCase();

      likeButton.addEventListener("click", async function () {
        try {
          await request(
            API_URL + "/api/posts/" + post.id + "/like",
            {
              method: "POST",
              body: JSON.stringify({
                username: currentUser
              })
            }
          );

          await loadPosts();

        } catch (error) {
          showMessage(error.message);
        }
      });

      card.append(
        title,
        date,
        visibility,
        content,
        likeButton
      );

      feed.appendChild(card);
    });

  } catch (error) {
    showMessage(error.message);
  }
}

// LOAD PEOPLE
async function loadPeople() {
  try {
    const result = await request(API_URL + "/api/users");

    const users = Array.isArray(result)
      ? result
      : Array.isArray(result.users)
        ? result.users
        : [];

    const followResult = await request(
      API_URL + "/api/following?username=" +
      encodeURIComponent(currentUser)
    );

    const followingNames = Array.isArray(followResult)
      ? followResult
      : Array.isArray(followResult.following)
        ? followResult.following
        : [];

    const following = followingNames.map(function (name) {
      return String(name).toLowerCase();
    });

    people.innerHTML = "";

    const others = users.filter(function (name) {
      return String(name).toLowerCase() !== currentUser.toLowerCase();
    });

    if (others.length === 0) {
      people.textContent =
        "No other users yet. Ask your friend to log in once.";
    } else {
      others.forEach(function (name) {
        const row = document.createElement("div");
        row.className = "person-row";

        const label = document.createElement("span");
        label.textContent = name;

        const button = document.createElement("button");
        button.className = "small-button";

        button.textContent =
          following.includes(String(name).toLowerCase())
            ? "Following"
            : "Follow";

        button.addEventListener("click", async function () {
          try {
            await request(API_URL + "/api/follow", {
              method: "POST",
              body: JSON.stringify({
                from: currentUser,
                to: name
              })
            });

            await loadPeople();
            await loadPosts();

          } catch (error) {
            showMessage(error.message);
          }
        });

        row.append(label, button);
        people.appendChild(row);
      });
    }

    // FOLLOWING LIST
    const followingData = await request(
      API_URL + "/api/following?username=" +
      encodeURIComponent(currentUser)
    );

    const followingListNames = Array.isArray(followingData)
      ? followingData
      : Array.isArray(followingData.following)
        ? followingData.following
        : [];

    // FOLLOWERS LIST
    const followersData = await request(
      API_URL + "/api/followers?username=" +
      encodeURIComponent(currentUser)
    );

    const followerNames = Array.isArray(followersData)
      ? followersData
      : Array.isArray(followersData.followers)
        ? followersData.followers
        : [];

    showNames(
      followingList,
      followingListNames,
      "You are not following anyone yet."
    );

    showNames(
      followersList,
      followerNames,
      "You do not have any followers yet."
    );

  } catch (error) {
    showMessage(error.message);
  }
}

// DISPLAY FOLLOWING / FOLLOWERS
function showNames(container, names, emptyText) {
  container.innerHTML = "";

  if (!Array.isArray(names) || names.length === 0) {
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

// INITIAL LOAD
loadPosts();
loadPeople();


const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const error = document.getElementById("error");

const API_URL = "https://exercise1b.onrender.com";

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const action = event.submitter.value;
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  error.textContent = "";

  try {
    const endpoint = action === "signup"
      ? "/api/signup"
      : "/api/login";

    const response = await fetch(API_URL + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    if (action === "signup") {
      error.textContent = "Account created! Now login.";
      passwordInput.value = "";
      return;
    }

    localStorage.setItem("microBlogUser", data.username);
    window.location.href = "home.html";

  } catch (err) {
    error.textContent = err.message;
  }
});

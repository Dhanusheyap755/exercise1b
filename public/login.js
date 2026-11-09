const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const error = document.getElementById("error");

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  error.textContent = "";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed.");
    localStorage.setItem("microBlogUser", data.username);
    window.location.href = "home.html";
  } catch (err) {
    error.textContent = err.message;
  }
});

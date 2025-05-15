document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    const messageElement = document.getElementById("message");

    if (response.ok) {
      messageElement.textContent = "Login avvenuto con successo!";
      messageElement.style.color = "green";

      // Salva il token JWT nel localStorage
      localStorage.setItem("token", result.token);

      // Reindirizza alla homepage
      window.location.href = "index.html";
    } else {
      messageElement.textContent = result.error || "Errore durante il login.";
      messageElement.style.color = "red";
    }
  } catch (error) {
    console.error("Errore:", error);
    document.getElementById("message").textContent = "Errore di rete.";
  }
});
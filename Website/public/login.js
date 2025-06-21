document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const result = await inviaRichiesta("POST", "/api/login", { email, password });
    const messageElement = document.getElementById("message");

    if (result.status === 200) {
      messageElement.textContent = "Login avvenuto con successo!";
      messageElement.style.color = "green";

      // Salva il token JWT nel localStorage
      localStorage.setItem("token", result.data.token);

      // Reindirizza alla homepage
      window.location.href = "index.html";
    } else {
      messageElement.textContent = result.err || (result.data && result.data.error) || "Errore durante il login.";
      messageElement.style.color = "red";
    }
  } catch (error) {
    console.error("Errore:", error);
    document.getElementById("message").textContent = "Errore di rete.";
  }
});
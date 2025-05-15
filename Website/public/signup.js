document.getElementById("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password, purchasedEAs: [] }),
    });

    const result = await response.json();
    const messageElement = document.getElementById("message");

    if (response.ok) {
      messageElement.textContent = "Registrazione avvenuta con successo! Ora puoi accedere.";
      messageElement.style.color = "green";
    } else {
      messageElement.textContent = result.error || "Errore durante la registrazione.";
      messageElement.style.color = "red";
    }
  } catch (error) {
    console.error("Errore:", error);
    document.getElementById("message").textContent = "Errore di rete.";
  }
});
// Aggiunge un event listener per la sottomissione del form di registrazione
document.getElementById("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault(); // Previene il comportamento di default del form

  // Recupera i valori inseriti dall'utente nei campi del form
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    // Invia una richiesta POST all'API di registrazione usando inviaRichiesta
    const result = await inviaRichiesta("POST", "/api/register", { username, email, password, purchasedEAs: [] });
    const messageElement = document.getElementById("message");

    if (result.status === 200 || result.status === 201) {
      // Se la registrazione ha successo, mostra un messaggio verde
      messageElement.textContent = "Registrazione avvenuta con successo! Ora puoi accedere.";
      messageElement.style.color = "green";
    } else {
      // Se c'è un errore, mostra il messaggio di errore in rosso
      messageElement.textContent = result.err || (result.data && result.data.error) || "Errore durante la registrazione.";
      messageElement.style.color = "red";
    }
  } catch (error) {
    // Gestione degli errori di rete
    console.error("Errore:", error);
    document.getElementById("message").textContent = "Errore di rete.";
  }
});
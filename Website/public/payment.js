document.addEventListener("DOMContentLoaded", function () {
  // Usa le funzioni della libreria per il carrello per utente
  const cart = getUserCart();
  const cartItems = document.getElementById("cartItems");

  if (cart.length === 0) {
    cartItems.textContent = "Il carrello è vuoto.";
    document.getElementById("completePayment").disabled = true;
  } else {
    cart.forEach((item) => {
      const div = document.createElement("div");
      div.textContent = `${item.name} - ${item.price} USD`;
      cartItems.appendChild(div);
    });
  }

  document.getElementById("completePayment").addEventListener("click", function () {
    alert("Pagamento completato con successo!");
    setUserCart([]); // Svuota il carrello dell'utente
    window.location.href = "index.html";
  });
});
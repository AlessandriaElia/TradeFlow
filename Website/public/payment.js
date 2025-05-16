document.addEventListener("DOMContentLoaded", function () {
  // Usa le funzioni della libreria per il carrello per utente
  const cart = getUserCart();
  const cartItems = document.getElementById("cartItems");
  const totalAmountElement = document.getElementById("totalAmount");
  let totalPrice = 0;

  // Svuota il container (rimuove l'esempio statico)
  cartItems.innerHTML = "";

  if (cart.length === 0) {
    // Crea un messaggio elegante per carrello vuoto
    cartItems.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-shopping-cart mb-3" style="font-size: 2rem; color: rgba(255,255,255,0.5);"></i>
        <p>Il tuo carrello è vuoto</p>
      </div>
    `;
    totalAmountElement.textContent = "0.00 USD";
    document.getElementById("completePayment").disabled = true;
  } else {
    // Popola il carrello con elementi dal design migliorato
    cart.forEach((item) => {
      // Calcola il totale
      totalPrice += parseFloat(item.price);
      
      // Crea l'elemento del carrello con la struttura richiesta
      const cartItemElement = document.createElement("div");
      cartItemElement.className = "cart-item";
      cartItemElement.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="fas fa-robot me-2 text-light-50"></i>
          <span class="cart-item-name">${item.name}</span>
        </div>
        <span class="cart-item-price">${item.price} USD</span>
      `;
      
      cartItems.appendChild(cartItemElement);
    });
    
    // Aggiorna il totale
    totalAmountElement.textContent = totalPrice.toFixed(2) + " USD";
  }

  document.getElementById("completePayment").addEventListener("click", function () {
    alert("Pagamento completato con successo!");
    setUserCart([]); // Svuota il carrello dell'utente
    window.location.href = "index.html";
  });
});
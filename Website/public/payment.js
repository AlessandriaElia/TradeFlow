document.addEventListener("DOMContentLoaded", function () {
    const cartItems = document.getElementById("cartItems");
    const cart = getUserCart();
    let totalPrice = 0;

    // Verifica se l'utente è loggato
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Se il carrello è vuoto, mostra un messaggio
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart fa-3x mb-3"></i>
                <p>Il tuo carrello è vuoto</p>
            </div>
        `;
        document.getElementById("completePayment").style.display = "none";
    } else {
        let cartHTML = '';
        
        // Crea gli elementi del carrello
        cart.forEach(item => {
            totalPrice += parseFloat(item.price);
            cartHTML += `
                <div class="cart-item">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-robot me-2"></i>
                        <span class="cart-item-name">${item.name}</span>
                    </div>
                    <span class="cart-item-price">${item.price} USD</span>
                </div>
            `;
        });

        // Aggiungi il totale
        cartHTML += `
            <div class="total-container mt-3">
                <span class="total-label">Totale:</span>
                <span class="total-amount">${totalPrice.toFixed(2)} USD</span>
            </div>
        `;

        cartItems.innerHTML = cartHTML;
    }

    // Gestione del pulsante "Completa Pagamento"
    document.getElementById("completePayment")?.addEventListener("click", async function() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Sessione scaduta. Effettua nuovamente il login.");
                window.location.href = "login.html";
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const response = await fetch('/api/payments/create', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    items: cart.map(item => ({
                        eaId: item.id,
                        price: item.price
                    }))
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Pagamento completato con successo!");
                setUserCart([]); // Svuota il carrello
                window.location.href = "dashboard.html";
            } else {
                throw new Error(data.message || "Errore durante il pagamento");
            }
        } catch (error) {
            console.error("Errore durante il pagamento:", error);
            alert(error.message || "Si è verificato un errore durante il pagamento");
        }
    });
});
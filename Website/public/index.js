"use strict";

// Funzioni di utilità per il carrello per utente
function getUserCartKey() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return `cart_${payload.email}`;
    } catch {
        return null;
    }
}
function getUserCart() {
    const cartKey = getUserCartKey();
    if (!cartKey) return [];
    return JSON.parse(localStorage.getItem(cartKey)) || [];
}
function setUserCart(cart) {
    const cartKey = getUserCartKey();
    if (!cartKey) return;
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

$(document).ready(function () {
    let bestEaList = $("#bestEaList");
    let allEAs = []; // Variabile globale per memorizzare gli EA ricevuti

    const authArea = $("#authArea");
    const loginSignupButtons = $("#loginSignupButtons");
    const userGreeting = $("#userGreeting");
    const dashboardLink = $("#dashboardLink");
    const logoutButton = $("#logoutButton");
    const usernameSpan = $("#username");
    const cartNavLink = $("#cartNavLink");
    const cartLink = $("#cartLink");

    // Controlla se l'utente è loggato
    const token = localStorage.getItem("token");
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const username = payload.username || "Utente";
            usernameSpan.text(username);
            loginSignupButtons.addClass("d-none");
            userGreeting.removeClass("d-none");
            cartLink.removeClass("d-none");
            logoutButton.removeClass("d-none");
        } catch (error) {
            console.error("Errore nella decodifica del token:", error);
        }
    }

    // Gestione del logout
    $("#logout").on("click", function () {
        localStorage.removeItem("token");
        location.reload();
    });

    // Gestione click sul carrello
    cartNavLink.on("click", function (e) {
        e.preventDefault();
        const cart = getUserCart();
        if (cart.length === 0) {
            alert("Il carrello è vuoto!");
            return;
        }
        window.location.href = "payment.html";
    });

    fetchData();

    // Event listener per i filtri
    $(".filter-btn").on("click", function () {
        const filter = $(this).data("filter");
        applyFilter(filter);
    });

    // Event listener per la ricerca
    $("#search").on("input", function () {
        const searchTerm = $(this).val().toLowerCase();
        applySearch(searchTerm);
    });

    // Funzione per applicare i filtri
    function applyFilter(filter) {
        let filteredEAs = [];
        switch (filter) {
            case "popular":
                filteredEAs = allEAs.filter(ea => ea.stars >= 4); // EA con stelle >= 4
                break;
            case "free":
                filteredEAs = allEAs.filter(ea => ea.price === 0); // EA gratuiti
                break;
            case "paid":
                filteredEAs = allEAs.filter(ea => ea.price > 0); // EA a pagamento
                break;
            case "all":
            default:
                filteredEAs = allEAs; // Mostra tutti gli EA
                break;
        }
        displayEAs(filteredEAs);
    }

    // Funzione per applicare la ricerca
    function applySearch(searchTerm) {
        const searchedEAs = allEAs.filter(ea => ea.name.toLowerCase().includes(searchTerm));
        displayEAs(searchedEAs);
    }

    // Funzione per visualizzare gli EA
    function displayEAs(eas) {
        bestEaList.empty();
        eas.forEach(ea => {
            const stars = '★'.repeat(Math.round(ea.stars)) + '☆'.repeat(5 - Math.round(ea.stars));
            const card = `
<div class="col-md-3 mb-4 ea-card">
    <div class="card">
        <div class="card-front">
            <img src="img/EAs/${ea.name.replace(/\s+/g, "_").toLowerCase()}.png" class="card-img-top" alt="${ea.name}">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title">${ea.name}</h5>
                <div class="stars">${stars}</div>
            </div>
            <button class="btn btn-primary card-button" data-id="${ea.id}">${ea.price === 0 ? "Gratis" : ea.price + " USD"}</button>
        </div>
    </div>
</div>
`;
            bestEaList.append(card);
        });

        // Aggiungi event listener ai pulsanti
        $(".card-button").on("click", function () {
            const eaId = $(this).data("id");
            window.location.href = `ea.html?id=${eaId}`;
        });
    }

    // Funzione per recuperare i dati degli EA
    async function fetchData() {
        try {
            const response = await inviaRichiesta("GET", "/api/experts");
            if (response.status === 200) {
                allEAs = response.data.experts; // Memorizziamo i dati una sola volta
                displayEAs(allEAs);
            } else {
                console.error("Errore nel recupero degli EA:", response.err);
            }
        } catch (error) {
            console.error("Errore nella richiesta:", error);
        }
    }
});
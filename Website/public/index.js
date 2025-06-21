"use strict";

/**
 * Controlla se l'EA è già stato acquistato dall'utente loggato
 * @param {number} eaId 
 * @returns {Promise<boolean>}
 */
async function checkIfAlreadyPurchased(eaId) {
    const token = localStorage.getItem("token");
    if (!token) return false;
    
    try {
        const response = await inviaRichiesta("GET", `/api/payments/check/${eaId}`);
        return response.status === 200 && response.data.purchased;
    } catch (error) {
        console.error("Errore nel controllo acquisto:", error);
        return false;
    }
}

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
    const CLOUDINARY_BASE_URL = "https://res.cloudinary.com/dmu6njtxz/image/upload/bots/";

    let bestEaList = $("#bestEaList");
    let allEAs = []; // Variabile globale per memorizzare gli EA ricevuti

    // Elementi della navbar per la gestione autenticazione
    const authArea = $("#authArea");
    const loginSignupButtons = $("#loginSignupButtons");
    const userGreeting = $("#userGreeting");
    const dashboardLink = $("#dashboardLink");
    const logoutButton = $("#logoutButton");
    const usernameSpan = $("#username");
    const cartNavLink = $("#cartNavLink");
    const cartLink = $("#cartLink");

    // Controlla se l'utente è loggato e aggiorna la navbar di conseguenza
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
            // Mostra il link della dashboard
            $("#dashboardLink").removeClass("d-none");
        } catch (error) {
            console.error("Errore nella decodifica del token:", error);
        }
    }

    // Gestione del logout: rimuove il token e ricarica la pagina
    $("#logout").on("click", function () {
        localStorage.removeItem("token");
        location.reload();
    });

    // Gestione click sul carrello: se vuoto mostra alert, altrimenti va alla pagina pagamento
    cartNavLink.on("click", function (e) {
        e.preventDefault();
        const cart = getUserCart();
        if (cart.length === 0) {
            alert("Il carrello è vuoto!");
            return;
        }
        window.location.href = "payment.html";
    });

    // Recupera e mostra tutti gli EA all'avvio
    fetchData();

    // Event listener per i filtri (popolari, gratis, a pagamento, tutti)
    $(".filter-btn").on("click", function () {
        const filter = $(this).data("filter");
        applyFilter(filter);
    });

    // Event listener per la ricerca
    $("#search").on("input", function () {
        const searchTerm = $(this).val().toLowerCase();
        applySearch(searchTerm);
    });

    /**
     * Applica il filtro selezionato agli EA
     * @param {string} filter 
     */
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

    /**
     * Applica la ricerca per nome agli EA
     * @param {string} searchTerm 
     */
    function applySearch(searchTerm) {
        const searchedEAs = allEAs.filter(ea => ea.name.toLowerCase().includes(searchTerm));
        displayEAs(searchedEAs);
    }

    /**
     * Mostra le card degli EA nella pagina
     * @param {Array} eas 
     */
    async function displayEAs(eas) {
        bestEaList.empty();
        
        for (const ea of eas) {
            const stars = '★'.repeat(Math.round(ea.stars)) + '☆'.repeat(5 - Math.round(ea.stars));
            const imageUrl = ea.image;
            
            let buttonHtml;
            if (token) {
                const isPurchased = await checkIfAlreadyPurchased(ea.id);
                if (isPurchased) {
                    buttonHtml = `
                        <button class="btn btn-secondary card-button" disabled>
                            <i class="fas fa-check me-2"></i>Già Acquistato
                        </button>
                        <a href="dashboard.html" class="btn btn-primary card-button mt-2">
                            <i class="fas fa-chart-line me-2"></i>Visualizza Performance
                        </a>
                    `;
                } else {
                    buttonHtml = `
                        <button class="btn btn-primary card-button" data-id="${ea.id}">
                            ${ea.price === 0 ? "Gratis" : ea.price + " USD"}
                        </button>
                    `;
                }
            } else {
                buttonHtml = `
                    <button class="btn btn-primary card-button" data-id="${ea.id}">
                        ${ea.price === 0 ? "Gratis" : ea.price + " USD"}
                    </button>
                `;
            }
    
            const card = `
                <div class="col-md-3 mb-4 ea-card">
                    <div class="card">
                        <div class="card-front">
                            <img src="${imageUrl}" class="card-img-top" alt="${ea.name}">
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${ea.name}</h5>
                                <div class="stars">${stars}</div>
                            </div>
                            ${buttonHtml}
                        </div>
                    </div>
                </div>
            `;
            
            bestEaList.append(card);
        }
    
        // Aggiungi event listener ai pulsanti delle card (solo quelli abilitati)
        $(".card-button").not("[disabled]").on("click", function() {
            const eaId = $(this).data("id");
            window.location.href = `ea.html?id=${eaId}`;
        });
    }

    /**
     * Recupera i dati degli EA dal server e li mostra
     */
    async function fetchData() {
        try {
            const response = await inviaRichiesta("GET", "/api/experts");
            if (response.status === 200) {
                allEAs = response.data.experts; 
                displayEAs(allEAs);
            } else {
                console.error("Errore nel recupero degli EA:", response.err);
            }
        } catch (error) {
            console.error("Errore nella richiesta:", error);
        }
    }

    /**
     * Gestione invio messaggio di contatto allo staff TradeFlow
     */
    $("#contactForm").on("submit", async function(e) {
        e.preventDefault();

        const name = $("#name").val().trim();
        const email = $("#email").val().trim();
        const message = $("#message").val().trim();

        // Validazione campi obbligatori
        if (!name || !email || !message) {
            alert("Per favore, compila tutti i campi");
            return;
        }

        // Validazione formato email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Per favore, inserisci un indirizzo email valido");
            return;
        }

        try {
            // Invia la richiesta POST usando inviaRichiesta
            const result = await inviaRichiesta("POST", "/api/messages", { name, email, message });

            if (result.status === 201) {
                alert("Messaggio inviato con successo!");
                // Pulisci il form
                $("#contactForm")[0].reset();
            } else {
                throw new Error(result.err || (result.data && result.data.error) || "Errore nell'invio del messaggio");
            }
        } catch (error) {
            console.error("Errore:", error);
            alert("Si è verificato un errore durante l'invio del messaggio");
        }
    });
});
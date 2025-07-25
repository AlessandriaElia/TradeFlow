"use strict";
console.log("ea.js caricato correttamente");
console.log("jQuery:", typeof $);

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

// Usa inviaRichiesta per controllare se l'EA è già stato acquistato
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

document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem("token");
    const loginSignupButtons = $("#loginSignupButtons");
    const userGreeting = $("#userGreeting");
    const cartLink = $("#cartLink");
    const cartNavLink = $("#cartNavLink");
    const logoutButton = $("#logoutButton");
    const usernameSpan = $("#username");
    const addToCartContainer = $("#addToCartContainer");
    const addToCartButton = $("#addToCartButton");

    // Navbar gestione login/logout/carrello
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

    // Logout
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

    // Mostra/nasconde il link carrello in base al contenuto
    function updateCartLinkState() {
        const cart = getUserCart();
        if (cart.length === 0) {
            cartNavLink.addClass("disabled").attr("tabindex", "-1").attr("aria-disabled", "true").css("pointer-events", "none").css("opacity", "0.5");
        } else {
            cartNavLink.removeClass("disabled").removeAttr("tabindex").removeAttr("aria-disabled").css("pointer-events", "").css("opacity", "");
        }
    }
    updateCartLinkState();

    // Recupera l'id dell'EA dalla query string
    const params = new URLSearchParams(window.location.search);
    const eaId = params.get("id");
    console.log("ID dell'EA:", eaId);

    if (!eaId) {
        alert("ID dell'Expert Advisor non trovato!");
        return;
    }

    try {
        // Recupera i dettagli dell'Expert Advisor dal server usando inviaRichiesta
        const response = await inviaRichiesta("GET", `/api/experts/${eaId}`);
        console.log("URL della richiesta:", `/api/experts/${eaId}`);
        console.log("Risposta del server:", response);

        if (response.status === 200) {
            const ea = response.data.expert;

            // Popola i dettagli dell'EA nella pagina
            $("#ea-name").text(ea.name);
            $("#ea-name-header").text(ea.name);
            $("#ea-creator").text(ea.creator);
            $("#ea-description").text(ea.description);
            $("#ea-price").text(ea.price);
            $("#ea-stars").text('★'.repeat(Math.round(ea.stars)) + '☆'.repeat(5 - Math.round(ea.stars)));
            $("#ea-reviews").text(ea.reviews);
            $("#ea-image").attr("src", ea.image); 
            $("#ea-gain").text(ea.performance.roi + "%");
            $("#ea-risk-level").text(ea.performance.risk_level);
            $("#ea-win-rate").text(ea.performance.win_rate + "%");

            // Calcoli aggiuntivi
            const performanceData = ea.performance.data;
            $("#ea-drawdown").text(calculateMaxDrawdown(performanceData) + "%");
            $("#ea-number-of-trades").text(calculateNumberOfTrades(performanceData));
            $("#ea-sharpe-ratio").text(calculateSharpeRatio(performanceData));
            $("#ea-total-profit").text(calculateTotalProfit(performanceData) + " USD");

            // Modifica la parte del codice che gestisce il pulsante di acquisto
            if (token) {
                const isPurchased = await checkIfAlreadyPurchased(ea.id);
                addToCartContainer.removeClass("d-none");
                
                if (isPurchased) {
                    // Se già acquistato, mostra i pulsanti appropriati
                    addToCartContainer.html(`
                        <button class="btn btn-secondary" disabled>
                            <i class="fas fa-check me-2"></i>Già Acquistato
                        </button>
                        <a href="dashboard.html" class="btn" style="background-color: #3A75C4; color: white; margin-left: 10px;">
                            <i class="fas fa-chart-line me-2"></i>Visualizza Performance
                        </a>
                    `);
                } else {
                    // Se non acquistato, mostra il pulsante "Aggiungi al Carrello"
                    addToCartButton.off("click").on("click", async function() {
                        // Check again before adding to cart (double check)
                        const currentlyPurchased = await checkIfAlreadyPurchased(ea.id);
                        if (currentlyPurchased) {
                            alert("Hai già acquistato questo Expert Advisor!");
                            location.reload(); // Reload to show correct buttons
                            return;
                        }

                        const cart = getUserCart();
                        if (cart.some(item => item.id === ea.id)) {
                            alert("Questo EA è già presente nel carrello!");
                            return;
                        }
                        cart.push(ea);
                        setUserCart(cart);
                        alert("EA aggiunto al carrello!");
                        updateCartLinkState();
                    });
                }
            } else {
                addToCartContainer.addClass("d-none");
            }

            // Aggiungi il calcolo della performance media
            $("#ea-average-performance").text(calculateAveragePerformance(ea.performance.data));

            // Aggiungi il sistema di rating
            const ratingContainer = $(`
                <div class="rating-container mt-3">
                    <h4>Valuta questo EA:</h4>
                    <div class="stars-container">
                        ${Array(5).fill().map((_, i) => 
                            `<span class="star" data-rating="${i + 1}">☆</span>`
                        ).join('')}
                    </div>
                </div>
            `);

            $("#ea-stars").parent().after(ratingContainer);

            // Gestisci l'hover sulle stelle
            $(".star").hover(
                function() {
                    const rating = $(this).data("rating");
                    $(".star").each((i, star) => {
                        $(star).text(i < rating ? "★" : "☆");
                    });
                },
                function() {
                    if (!$(this).hasClass("selected")) {
                        $(".star").text("☆");
                    }
                }
            );

            // Gestisci il click sulle stelle
            $(".star").click(async function() {
                if (!localStorage.getItem("token")) {
                    alert("Devi effettuare il login per votare!");
                    return;
                }

                const rating = $(this).data("rating");
                try {
                    const result = await submitRating(ea.id, rating);
                    ea.stars = result.newAverageRating;
                    ea.reviews++;
                    
                    // Aggiorna le stelle visualizzate
                    $("#ea-stars").text('★'.repeat(Math.round(ea.stars)) + 
                                     '☆'.repeat(5 - Math.round(ea.stars)));
                    $("#ea-reviews").text(ea.reviews);
                    
                    alert("Grazie per la tua valutazione!");
                } catch (error) {
                    alert("Errore nell'invio della valutazione");
                }
            });

            // Genera il grafico delle performance
            generatePerformanceChart(ea.performance);
        } else {
            console.error("Errore nel recupero dei dettagli dell'EA:", response.err);
            alert("Errore nel caricamento dei dati dell'Expert Advisor.");
        }
    } catch (error) {
        console.error("Errore nella richiesta:", error);
        alert("Errore nella comunicazione con il server.");
    }
});

// Funzione per generare il grafico delle performance
function generatePerformanceChart(performance) {
    if (!performance || !performance.data || !Array.isArray(performance.data)) {
        console.error("Dati performance non validi:", performance);
        return;
    }

    const data = [
        {
            x: Array.from({ length: performance.data.length }, (_, i) => i + 1),
            y: performance.data,
            type: "scatter",
            mode: "lines+markers",
            marker: { 
                color: "#3A75C4",
                size: 6 
            },
            line: { 
                shape: "spline",
                width: 2,
                color: "#3A75C4"
            },
            name: "Performance"
        }
    ];

    const layout = {
        title: {
            text: "Performance nel tempo",
            font: { 
                color: "black",
                size: 24
            }
        },
        xaxis: { 
            title: "Giorni",
            gridcolor: "#e0e0e0",
            zerolinecolor: "#e0e0e0"
        },
        yaxis: { 
            title: "Valore (USD)",
            gridcolor: "#e0e0e0",
            zerolinecolor: "#e0e0e0"
        },
        paper_bgcolor: "white",
        plot_bgcolor: "white",
        font: { color: "black" },
        margin: { t: 50, r: 50, b: 50, l: 50 }
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    };

    Plotly.newPlot("performanceChart", data, layout, config);
}

// Calcola il massimo drawdown della serie storica
function calculateMaxDrawdown(data) {
    let maxDrawdown = 0;
    let peak = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i] > peak) {
            peak = data[i];
        }
        const drawdown = (peak - data[i]) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    return (maxDrawdown * 100).toFixed(2); // Percentuale
}
function calculateNumberOfTrades(data) {
    return data.length;
}
function calculateSharpeRatio(data) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
        returns.push((data[i] - data[i - 1]) / data[i - 1]);
    }

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.map(r => Math.pow(r - meanReturn, 2)).reduce((a, b) => a + b, 0) / returns.length);

    return (meanReturn / stdDev).toFixed(2);
}
function calculateTotalProfit(data) {
    const profit = ((data[data.length - 1] - data[0]) / data[0]) * 100;
    return profit.toFixed(2) + "%";
}

// Calcola la performance media giornaliera
function calculateAveragePerformance(data) {
    const changes = [];
    for (let i = 1; i < data.length; i++) {
        const change = ((data[i] - data[i-1]) / data[i-1]) * 100;
        changes.push(change);
    }
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return avgChange.toFixed(2) + "%";
}

async function submitRating(eaId, rating) {
    try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Utente non autenticato");

        const response = await inviaRichiesta(
            "POST",
            `/api/experts/${eaId}/rate`,
            { rating }
        );

        if (response.status !== 200) {
            throw new Error(response.err || (response.data && response.data.error) || 'Errore durante il rating');
        }

        return response.data;
    } catch (error) {
        console.error("Error submitting rating:", error);
        throw error;
    }
}
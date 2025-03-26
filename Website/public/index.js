"use strict";
$(document).ready(function () {
    let bestEaList = $("#bestEaList");
    let allEAs = []; // Variabile globale per memorizzare gli EA ricevuti

    fetchData(); 
    logEAs(); 

    function displayEAs(eas) {
        bestEaList.empty();
        eas.forEach(ea => {
            const stars = '★'.repeat(Math.round(ea.stars)) + '☆'.repeat(5 - Math.round(ea.stars));
            const card = `
                <div class="col-md-3 mb-4 ea-card">
                    <div class="card">
                        <div class="card-front">
                            <img src="img/EAs/${ea.name}.png" class="card-img-top" alt="${ea.name}">
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${ea.name}</h5>
                                <div class="stars">${stars}</div>
                                <button class="btn btn-gold mt-auto">${ea.price} USD</button>
                                <a href="/api/generateEAHtml/${ea.id}" class="btn btn-primary mt-2" target="_blank" style="background-color:gold; color:black">View Details</a>
                            </div>
                        </div>
                        <div class="card-back">
                            <h5>${ea.name}</h5>
                            <div class="stars">${stars} <span class="review-count">(${ea.reviews} recensioni)</span></div>
                            <p>${ea.description}</p>
                            <p>- ${ea.creator} -</p>
                            <button class="btn btn-gold mt-auto">${ea.price} USD</button>
                            <a href="/api/generateEAHtml/${ea.id}" class="btn btn-primary mt-2" target="_blank" style="background-color:gold; color:black;">View Details</a>
                        </div>
                    </div>
                </div>
                `;
            bestEaList.append(card);
        });
    }

    async function fetchData() {
        try {
            const response = await fetch("http://localhost:5000/received-data");
            const data = await response.json();

            if (data.status === "success") {
                const pre = document.getElementById("received-data");
                pre.textContent = JSON.stringify(data.receivedData, null, 2);
            } else {
                console.error("Errore nel recupero dei dati:", data.message);
            }
        } catch (error) {
            console.error("Errore nella richiesta:", error);
        }
    }

    async function logEAs(filter = "all", searchQuery = "") {
        try {
            const response = await fetch(`http://localhost:5000/api/generateEAs?filter=${filter}&search=${searchQuery}`);
            const data = await response.json();

            if (data.status === "success") {
                console.log("Dati generati degli Expert Advisors:", data.experts);
                allEAs = data.experts; // Memorizziamo i dati una sola volta
                displayEAs(allEAs); 
            } else {
                console.error("Errore nel recupero degli Expert Advisors:", data.message);
            }
        } catch (error) {
            console.error("Errore nella richiesta di generazione EA:", error);
        }
    }

    // Funzione per filtrare i dati già ricevuti
    function filterEAs(searchQuery) {
        const filteredEAs = allEAs.filter(ea => ea.name.toLowerCase().includes(searchQuery.toLowerCase()));
        displayEAs(filteredEAs); // Mostra solo gli EA filtrati
    }

    // Event listeners per i pulsanti di filtro
    $(".filter-btn").on("click", function() {
        const filter = $(this).data("filter");
        logEAs(filter, $("#search").val());
    });

    // Event listener per l'input di ricerca
    $("#search").on("input", function() {
        const searchQuery = $(this).val();
        filterEAs(searchQuery); // Filtra senza ricaricare i dati
    });
});

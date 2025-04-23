"use strict";
$(document).ready(function () {
    let bestEaList = $("#bestEaList");
    let allEAs = []; // Variabile globale per memorizzare gli EA ricevuti

    fetchData();

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
            </div>
            <a href="/api/generateEAHtml/${ea.id}" class="btn btn-primary card-button" target="_blank">${ea.price} USD</a>
        </div>
    </div>
</div>
`;
            bestEaList.append(card);
        });
    }

    async function fetchData() {
        try {
            const response = await fetch("http://localhost:5000/api/generateEAs");
            const data = await response.json();

            if (data.status === "success") {
                allEAs = data.experts; // Memorizziamo i dati una sola volta
                displayEAs(allEAs);
            } else {
                console.error("Errore nel recupero degli EA:", data.message);
            }
        } catch (error) {
            console.error("Errore nella richiesta:", error);
        }
    }

    async function applyFilter(filter, searchQuery = "") {
        try {
            // Legge il file experts.json
            const response = await fetch("./DB/experts.json");
            const data = await response.json();
    
            if (data) {
                let filteredEAs = data;
    
                // Applica il filtro
                if (filter === "popular") {
                    filteredEAs = filteredEAs.sort((a, b) => b.stars - a.stars);
                } else if (filter === "new") {
                    filteredEAs = filteredEAs.sort((a, b) => b.id - a.id);
                } else if (filter === "free") {
                    filteredEAs = filteredEAs.filter(ea => ea.price === 0);
                } else if (filter === "paid") {
                    filteredEAs = filteredEAs.filter(ea => ea.price > 0);
                }
    
                // Applica la ricerca
                if (searchQuery) {
                    filteredEAs = filteredEAs.filter(ea =>
                        ea.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }
    
                // Mostra i dati filtrati
                displayEAs(filteredEAs);
            } else {
                console.error("Errore nel caricamento degli EA dal file JSON.");
            }
        } catch (error) {
            console.error("Errore nella lettura del file JSON:", error);
        }
    }

    // Event listeners per i pulsanti di filtro
    $(".filter-btn").on("click", function () {
        const filter = $(this).data("filter");
        applyFilter(filter, $("#search").val());
    });

    // Event listener per l'input di ricerca
    $("#search").on("input", function () {
        const searchQuery = $(this).val();
        applyFilter("all", searchQuery); // Filtra senza ricaricare i dati
    });
});
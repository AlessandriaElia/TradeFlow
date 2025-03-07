"use strict";
$(document).ready(function () {
    let bestEaList = $("#bestEaList");
    let eaData = []; 

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
                            <a href="/api/generateEAHtml/${ea.id}" class="btn btn-primary mt-2" target="_blank"style="background-color:gold; color:black">View Details</a>
                        </div>
                    </div>
                </div>
                `;
            bestEaList.append(card);
        });
    }

    $(".filter-btn").click(function () {
        $(".filter-btn").css("background-color", "gold");
        $(this).css("background-color", "#ffcc00"); 

        let filter = $(this).data("filter");

        let filteredEAs = eaData;
        if (filter !== "all") {
            filteredEAs = eaData.filter(ea => {
                if (filter === "popular" && ea.stars >= 4) return true;
                if (filter === "new" && ea.isNew) return true;
                if (filter === "free" && ea.price === 0) return true;
                if (filter === "paid" && ea.price > 0) return true;
                return false;
            });
        }

        displayEAs(filteredEAs);
    });

    $("#search").on("input", function () {
        let query = $(this).val().toLowerCase();
        let searchedEAs = eaData.filter(ea => {
            return ea.name.toLowerCase().includes(query) || ea.description.toLowerCase().includes(query);
        });
        displayEAs(searchedEAs); 
    });

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

    async function logEAs() {
        try {
            const response = await fetch("http://localhost:5000/api/generateEAs?N=5");
            const data = await response.json();

            if (data.status === "success") {
                console.log("Dati generati degli Expert Advisors:", data.experts);
                displayEAs(data.experts); 
            } else {
                console.error("Errore nel recupero degli Expert Advisors:", data.message);
            }
        } catch (error) {
            console.error("Errore nella richiesta di generazione EA:", error);
        }
    }
});

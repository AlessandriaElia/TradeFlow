"use strict";
$(document).ready(function () {
    let bestEaList = $("#bestEaList");
    let eaData = [];

    // Recupera i dati degli EA
    async function getEAs() {
        let rq = await inviaRichiesta("GET", "/api/getEAs");
        if (rq.status == 401) {
            alert("Errore nella richiesta");
        } else if (rq.status == 200) {
            console.log("EA ricevuti");
            eaData = rq.data;
            renderEAs(eaData);
        }
    }

    function renderEAs(eas) {
        bestEaList.empty();
        eas.forEach(ea => {
            const card = `
            <div class="col-md-3 mb-4 ea-card">
                <div class="card">
                    <!-- Lato Frontale -->
                    <div class="card-front" style="background-color: #3A75C4; color:gold; padding: 15px; height: 400px; display: flex; flex-direction: column; justify-content: space-between;">
                        <img src="img/EAs/${ea.name}.png" class="card-img-top" alt="${ea.name}" style="width:100%; height:auto;">
                        <div class="card-body text-center">
                            <h5 class="card-title">${ea.name}</h5>
                            <div class="stars">
                                ${'★'.repeat(ea.rating)}${'☆'.repeat(5 - ea.rating)}
                            </div>
                            <p class="card-price">${ea.price} USD</p>
                        </div>
                    </div>
        
                    <!-- Lato Retro -->
                    <div class="card-back" style="padding: 15px; height: 400px; display: flex; flex-direction: column; justify-content: space-between;">
                        <h5 style="color:gold" class="text-center">${ea.name}</h5>
                        <div class="text-center">
                            <div class="stars">
                                ${'★'.repeat(ea.rating)}${'☆'.repeat(5 - ea.rating)}
                            </div>
                            <p><strong>${ea.reviews} recensioni</strong></p>
                        </div>
                        <p>${ea.description}</p>
                        <p class="card-price">${ea.price} USD</p>
                        <a href="#" class="btn" style="background-color:gold">Scopri di più</a>
                    </div>
                </div>
            </div>`;
        
        bestEaList.append(card);
        

        });

        $(".ea-card .card").hover(function () {
            $(this).toggleClass("flipped");
        });
    }

    // Filtri
    $(".filter-btn").click(function () {
        let filter = $(this).data("filter");
        let filteredEAs = eaData;
        if (filter === "free") {
            filteredEAs = eaData.filter(ea => ea.price === 0);
        } else if (filter === "paid") {
            filteredEAs = eaData.filter(ea => ea.price > 0);
        }
        renderEAs(filteredEAs);
    });

    getEAs();
});

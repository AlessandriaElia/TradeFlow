"use strict"
$(document).ready(function () {
    let bestEaList = $("#bestEaList");
    getEAs();

    async function getEAs() {
        let rq = await inviaRichiesta("GET", "/api/getEAs");
        if (rq.status == 401) {
            alert("Errore nella richiesta");
        }
        else if (rq.status == 200) {
            console.log("EA ricevuti");
            let eas = rq.data;
            eas.forEach(ea => {
                const card = `
            <div class="col-md-3 mb-4" style="text-align: center;">
    <div class="card" style="max-width: 100%; height: 100%; background-color: #3A75C4; padding:25px">
        <img src="img/EAs/${ea.name}.png" class="card-img-top" alt="${ea.name}" style="height: 180px; object-fit: contain;">
        <div class="card-body" style="background-color: #3A75C4; color: black; padding: 10px;">
            <h5 class="card-title" style="color: gold; font-size: 1.1rem;">${ea.name}</h5>
            <p class="card-text" style="font-size: 0.9rem;">${ea.description}</p>
            <p class="card-text" style="font-size: 0.8rem;">- ${ea.creator} -</p>
            <a href="#" class="btn" style="background-color: gold; font-size: 0.9rem;">Acquista a ${ea.price}</a>
        </div>
    </div>
</div>

        `;
                bestEaList.append(card);
            });
        }

    }

    async function fetchData() {
        try {
            const response = await fetch('http://localhost:5000/received-data');
            const data = await response.json();

            if (data.status === 'success') {
                // Visualizza i dati nella pagina
                const pre = document.getElementById('received-data');
                pre.textContent = JSON.stringify(data.receivedData, null, 2);
            } else {
                console.error('Errore nel recupero dei dati:', data.message);
            }
        } catch (error) {
            console.error('Errore nella richiesta:', error);
        }
    }

    // Aggiorna i dati ogni 5 secondi
    //setInterval(fetchData, 5000);


});
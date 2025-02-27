"use strict"
$(document).ready(function() {
let bestEaList = $("#bestEaList");
getEAs();
    async function getEAs(){
        const rq = inviaRichiesta("GET", "/api/EA");
        rq.then(function(data){
            
        })
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
    setInterval(fetchData, 5000);
    

});

// Funzione per recuperare i dati dal server


/*
<div class="col-md-4 mb-4">
          <div class="card">
            <img src="img/bot1.jpg" class="card-img-top" alt="Bot 1">
            <div class="card-body">
              <h5 class="card-title">Bot di Trading 1</h5>
              <p class="card-text">Descrizione del Bot di Trading 1.</p>
              <a href="#" class="btn btn-primary">Scopri di più</a>
            </div>
          </div>
        </div>
        */
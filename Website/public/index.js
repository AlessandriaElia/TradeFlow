// Funzione per recuperare i dati dal server
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

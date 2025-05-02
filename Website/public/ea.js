"use strict";
console.log("ea.js caricato correttamente");
console.log("jQuery:", typeof $);

document.addEventListener("DOMContentLoaded", async function () {


    const params = new URLSearchParams(window.location.search);
const eaId = params.get("id");
console.log("ID dell'EA:", eaId);

    if (!eaId) {
        alert("ID dell'Expert Advisor non trovato!");
        return;
    }

    try {
        // Recupera i dettagli dell'Expert Advisor dal server
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
            $("#ea-image").attr("src", `img/EAs/${ea.name.replace(/\s+/g, "_").toLowerCase()}.png`);
            $("#ea-gain").text(ea.performance.roi + "%");
            $("#ea-risk-level").text(ea.performance.risk_level);
            $("#ea-win-rate").text(ea.performance.win_rate + "%");
        
            // Calcoli aggiuntivi
            const performanceData = ea.performance.data;
            $("#ea-drawdown").text(calculateMaxDrawdown(performanceData) + "%");
            $("#ea-number-of-trades").text(calculateNumberOfTrades(performanceData));
            $("#ea-sharpe-ratio").text(calculateSharpeRatio(performanceData));
            $("#ea-total-profit").text(calculateTotalProfit(performanceData) + " USD");
        
            // Genera il grafico delle performance con Plotly
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

function generatePerformanceChart(performance) {
    const data = [
        {
            x: Array.from({ length: performance.data.length }, (_, i) => i + 1), // Giorni
            y: performance.data, // Valori di performance
            type: "scatter",
            mode: "lines+markers",
            marker: { color: "blue" },
            line: { shape: "spline" },
            name: "Performance"
        }
    ];

    const layout = {
        title: "Performance nel tempo",
        xaxis: { title: "Giorni" },
        yaxis: { title: "Valore (USD)" },
        paper_bgcolor: "white", // Sfondo bianco per l'intero grafico
        plot_bgcolor: "white",  // Sfondo bianco per l'area del grafico
        font: { color: "black" } // Testo nero per contrastare lo sfondo bianco
    };

    Plotly.newPlot("performanceChart", data, layout);
}
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
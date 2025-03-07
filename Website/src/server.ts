"use strict";

import http from "http";
import fs from "fs";
import express, { NextFunction, Request, Response } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";
import path from "path";

/* ********************** MONGO CONFIG ********************* */
const connectionString = "mongodb://localhost:27017"; 
const DB_NAME = "ExpertAdvisor"; 

/* ********************** HTTP SERVER ********************** */
const port = 5000; 
let paginaErrore: string; 
const app = express();
const server = http.createServer(app);

server.listen(port, () => {
  init();
  console.log(`Server in esecuzione su http://localhost:${port}`);
});
let dictionary: any = {};

function init() {
  fs.readFile("./static/error.html", (err, data) => {
    if (!err) {
      paginaErrore = data.toString();
    } else {
      paginaErrore = "<h1>Risorsa non trovata</h1>";
    }
  });
  fs.readFile("./DB/dictionaries.json", "utf8", (err, data) => {
    if (err) {
        console.error("Errore nel caricamento del dizionario:", err);
    } else {
        dictionary = JSON.parse(data);
        console.log("✅ Dizionario caricato correttamente!");
    }
});
}

/* ********************** MIDDLEWARE ********************** */
app.use("/", (req: Request, res: Response, next: NextFunction) => {
  console.log(req.method + ": " + req.originalUrl);
  next();
});

app.use("/", express.static("./static"));
app.use("/", express.json({ limit: "10mb" }));
app.use("/", express.urlencoded({ limit: "10mb", extended: true }));
app.use("/", fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } }));

app.use("/", (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    console.log("--> GET params: " + JSON.stringify(req.query));
  }
  if (Object.keys(req.body).length > 0) {
    console.log("--> BODY params: " + JSON.stringify(req.body));
  }
  next();
});

const corsOptions = {
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true,
};
app.use("/", cors(corsOptions));

app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());

let receivedData: Record<string, any> = {};

app.post("/post", (req: any, res: any) => {
  console.log("Dati ricevuti:", req.body);

  if (!req.body) {
    return res.status(400).json({ error: "No data received or invalid JSON" });
  }

  receivedData = req.body;

  res.json({
    status: "success",
    message: "Dati ricevuti correttamente!",
    receivedData: req.body,
  });
});

app.get("/received-data", (req, res) => {
  res.json({
    status: "success",
    receivedData: receivedData,
  });
});

app.use(express.static(path.join(__dirname, "../public")));

/* ********************** API PER GENERARE EAs ********************** */

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCase(min: number, max: number): string {
  let result = Math.floor(Math.random() * (max - min + 1)) + min;
  switch (result) {
    case 1:
      return "Basso";
    case 2:
      return "Medio";
    case 3:
      return "Alto";
    default:
      return "Unknown";
  }
};

const randomFloat = (min: number, max: number): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

function generatePerformanceData(roi: number, winRate: number): number[] {
  const data = [];
  let value = 5000; // Starting value

  for (let i = 0; i < 30; i++) {
    const change = (roi / 100) * (winRate / 100) * (Math.random() * 2 - 1); // Change based on ROI and win rate
    value += value * change;
    data.push(parseFloat(value.toFixed(2)));
  }

  return data;
}

app.get("/api/generateEAs", async (req: any, res: any) => {
  const N = parseInt(req.query.N as string) || 5; 

  if (N <= 0) {
    return res
      .status(400)
      .json({ error: "Il numero di Expert Advisors deve essere maggiore di 0" });
  }

  const generateEA = () => {
    const roi = randomFloat(5, 50);
    const winRate = randomInt(50, 95);
    return {
      id: randomInt(1, 10000),
      name: dictionary.names[randomInt(0, dictionary.names.length - 1)],
      creator: dictionary.creators[randomInt(0, dictionary.creators.length - 1)],
      description:
        dictionary.descriptions[randomInt(0, dictionary.descriptions.length - 1)],
      performance: {
        roi: roi,
        risk_level: randomCase(1, 3),
        win_rate: winRate,
        data: generatePerformanceData(roi, winRate)
      },
      price: randomInt(50, 500),
      stars: randomInt(1, 5),
      reviews: randomInt(10, 500),
      image: `${dictionary.names[randomInt(0, dictionary.names.length - 1)]}.png`,
      historical_data: `${dictionary.names[randomInt(0, dictionary.names.length - 1)]}.json`,
    };
  };

  const generatedEAs = Array.from({ length: N }, generateEA);

  fs.writeFile("./DB/experts.json", JSON.stringify(generatedEAs, null, 2), (err) => {
    if (err) {
      console.error("Errore nel salvataggio degli Expert Advisors:", err);
      return res.status(500).json({ error: "Errore nel salvataggio degli Expert Advisors" });
    }
    res.json({ status: "success", experts: generatedEAs });
  });
});

app.get("/api/generateEAHtml/:id", async (req: any, res: any) => {
  const eaId = parseInt(req.params.id);

  fs.readFile("./DB/experts.json", "utf8", (err, data) => {
    if (err) {
      console.error("Errore nel caricamento degli Expert Advisors:", err);
      return res.status(500).send("Errore nel caricamento degli Expert Advisors");
    }

    const experts = JSON.parse(data);
    const ea = experts.find((ea: any) => ea.id === eaId);

    if (!ea) {
      return res.status(404).send("Expert Advisor not found");
    }

    // Calcoliamo le informazioni aggiuntive
    const firstValue = ea.performance.data[0];
    const lastValue = ea.performance.data[ea.performance.data.length - 1];
    let gain = (lastValue - firstValue) / firstValue * 100;
    gain = parseFloat(gain.toFixed(2));

    const calculateWinRate = (data: number[]): number => {
      let winningTrades = 0;

      // Confronta i dati adiacenti (data[i] con data[i+1])
      for (let i = 0; i < data.length - 1; i++) {
        if (data[i] < data[i + 1]) { // Se il valore successivo è maggiore, il trade è profittevole
          winningTrades++;
        }
      }

      // Calcola il win rate come percentuale
      const winRate = (winningTrades / (data.length - 1)) * 100;

      return winRate;
    };

    const calculateDrawdown = (data: number[]): number => {
      let peak = data[0];
      let maxDrawdown = 0;

      for (let i = 1; i < data.length; i++) {
        if (data[i] > peak) {
          peak = data[i]; // Nuovo massimo
        }
        const drawdown = (peak - data[i]) / peak * 100; // Calcola la perdita percentuale
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown; // Trova il massimo drawdown
        }
      }

      return maxDrawdown;
    };

    // Calcoliamo il massimo drawdown
    const drawdown = calculateDrawdown(ea.performance.data);
    console.log("Maximum Drawdown:", drawdown.toFixed(2), "%");

    // Calcoliamo il win rate
    let winRate = calculateWinRate(ea.performance.data);
    winRate = parseFloat(winRate.toFixed(2));

    // Aggiungiamo altre informazioni come il rendimento medio e il numero di operazioni
    const averagePerformance = ea.performance.data.reduce((sum: number, value: number) => sum + value, 0) / ea.performance.data.length;
    const numberOfTrades = ea.performance.data.length - 1; // Una "trade" è un cambiamento tra due punti
    const calculateSharpeRatio = (data: number[], riskFreeRate: number): number => {
      const dailyReturns: number[] = [];
      
      // Calcola i rendimenti giornalieri (percentuali)
      for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i] - data[i - 1]) / data[i - 1];
        dailyReturns.push(dailyReturn);
      }
      
      // Calcola il rendimento medio dell'EA
      const averageReturn = dailyReturns.reduce((acc, value) => acc + value, 0) / dailyReturns.length;
      
      // Calcola la deviazione standard (volatilità) dei rendimenti giornalieri
      const variance = dailyReturns.reduce((acc, value) => acc + Math.pow(value - averageReturn, 2), 0) / dailyReturns.length;
      const volatility = Math.sqrt(variance);
      
      // Calcola lo Sharpe Ratio
      const sharpeRatio = (averageReturn - riskFreeRate) / volatility;
      
      return parseFloat(sharpeRatio.toFixed(2));
    };

    let sharpeRatio = calculateSharpeRatio(ea.performance.data, 0.01);

    const calculateTotalProfitPercentage = (data: number[]): number => {
      const initialValue = data[0];
      const finalValue = data[data.length - 1];
      
      const profitPercentage = ((finalValue - initialValue) / initialValue) * 100;
      
      return parseFloat(profitPercentage.toFixed(2));
    };

    let totalProfitPercentage = calculateTotalProfitPercentage(ea.performance.data);
    const htmlContent = `
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ea.name}</title>
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body style="background-color: #00154B; color: white;">

  <div class="container mt-5">
    <div class="card" style="color:black;">
      <div class="card-header">
        <h1 style="color: gold;">${ea.name}</h1>
      </div>
      <div class="card-body">
        <p><strong>Creator:</strong> ${ea.creator}</p>
        <p><strong>Description:</strong> ${ea.description}</p>
        <p><strong>Price:</strong> ${ea.price} USD</p>
        <p><strong>Stars:</strong> ${'★'.repeat(ea.stars)}${'☆'.repeat(5 - ea.stars)}</p>
        <p><strong>Reviews:</strong> ${ea.reviews}</p>
        <img src="img/EAs/${ea.name}.png" alt="${ea.name}" class="img-fluid mb-3">

        <!-- Statistiche -->
        <div class="row">
          <div class="col-md-3">
            <div class="stat card text-center" style="background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">Gain</h3>
                <p class="card-text"style="color:white;">${gain}%</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat card text-center" style="background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">Risk Level</h3>
                <p class="card-text"style="color:white;">${ea.performance.risk_level}</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat card text-center" style="background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">Win Rate</h3>
                <p class="card-text"style="color:white;">${winRate}%</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat card text-center" style="background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">A. Performance</h3>
                <p class="card-text"style="color:white;">${averagePerformance.toFixed(2)} USD</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Nuove informazioni -->
        <div class="row">
          <div class="col-md-3">
            <div class="stat card text-center" style="margin-top:15px; background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">Max Drawdown</h3>
                <p class="card-text"style="color:white;">${drawdown.toFixed(2)}%</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat card text-center" style="margin-top:15px; background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">N. Trades</h3>
                <p class="card-text" style="color:white;">${numberOfTrades}</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat card text-center" style="margin-top:15px; background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">Sharpe Ratio</h3>
                <p class="card-text"style="color:white;">${sharpeRatio}</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat card text-center" style="margin-top:15px; background-color: #3A75C4;">
              <div class="card-body">
                <h3 class="card-title" style="color: gold;">Total Profit</h3>
                <p class="card-text"style="color:white;">${totalProfitPercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Chart -->
        <div class="chart-container mb-3">
          <canvas id="performanceChart"></canvas>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
  <script>
    async function fetchPerformanceData() {
      const response = await fetch('/api/generatePerformanceData/${eaId}');
      const data = await response.json();
      const ctx = document.getElementById('performanceChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Performance',
            data: data.values,
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    fetchPerformanceData();
  </script>
</body>
</html>
`;

    res.send(htmlContent);
  });
});


app.get("/api/generatePerformanceData/:id", (req: any, res: any) => {
  const eaId = parseInt(req.params.id);

  fs.readFile("./DB/experts.json", "utf8", (err, data) => {
    if (err) {
      console.error("Errore nel caricamento degli Expert Advisors:", err);
      return res.status(500).send("Errore nel caricamento degli Expert Advisors");
    }

    const experts = JSON.parse(data);
    const ea = experts.find((ea: any) => ea.id === eaId);

    if (!ea) {
      return res.status(404).send("Expert Advisor not found");
    }

    const labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    const values = ea.performance.data;

    res.json({ labels, values });
  });
});

"use strict";

import http from "http";
import fs from "fs";
import express, { NextFunction, Request, Response } from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors, { CorsOptions } from "cors";
import fileUpload from "express-fileupload";
import url from 'url';
import bodyParser from 'body-parser';
import path from 'path';

/* ********************** MONGO CONFIG ********************* */
// Stringa di connessione e nome del database specificati direttamente
const connectionString = "mongodb://localhost:27017"; // Inserisci qui la tua stringa di connessione
const DB_NAME = "ExpertAdvisor"; // Nome del database

/* ********************** HTTP SERVER ********************** */
// Configurazione del server HTTP
const port = 5000; // Porta su cui gira il server
let paginaErrore: string; // Contenuto della pagina di errore
const app = express(); // Inizializzazione di Express
const server = http.createServer(app); // Creazione del server HTTP

// Avvio del server
server.listen(port, () => {
  init(); // Caricamento della pagina di errore
  console.log(`Server in esecuzione su http://localhost:${port}`);
});

// Funzione per caricare la pagina di errore
function init() {
  fs.readFile("./static/error.html", (err, data) => {
    if (!err) {
      paginaErrore = data.toString();
    } else {
      paginaErrore = "<h1>Risorsa non trovata</h1>";
    }
  });
}

/* ********************** MIDDLEWARE ********************** */
// Questi middleware sono comuni e non devono essere toccati.
app.use("/", (req: Request, res: Response, next: NextFunction) => {
  console.log(req.method + ": " + req.originalUrl);
  next();
});

app.use("/", express.static("./static")); // Risorse statiche
app.use("/", express.json({ limit: "10mb" })); // Parametri JSON
app.use("/", express.urlencoded({ limit: "10mb", extended: true })); // Parametri URL-encoded
app.use("/", fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } })); // Configurazione file upload

app.use("/", (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    console.log("--> GET params: " + JSON.stringify(req.query));
  }
  if (Object.keys(req.body).length > 0) {
    console.log("--> BODY params: " + JSON.stringify(req.body));
  }
  next();
});

// Configurazione CORS
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

app.post('/post', (req:any, res:any) => {
    console.log('Dati ricevuti:', req.body);

    if (!req.body) {
        return res.status(400).json({ error: 'No data received or invalid JSON' });
    }

    receivedData = req.body;

    res.json({
        status: 'success',
        message: 'Dati ricevuti correttamente!',
        receivedData: req.body
    });
});

// Endpoint GET per recuperare i dati ricevuti
app.get('/received-data', (req, res) => {
    res.json({
        status: 'success',
        receivedData: receivedData
    });
});

// Serviamo la cartella 'public' per accedere al file HTML
app.use(express.static(path.join(__dirname, '../public')));

/* ********************** ROUTE PRINCIPALI ********************** */


app.get('/api/getEAs', async (req, res) => {
    const client = new MongoClient(connectionString);
    await client.connect().catch((err) => res.status(500).send('Internal server error: ' + err));
    const collection = client.db(DB_NAME).collection('experts'); 

    try {
        // Recupero i dati dalla collection
        const data = await collection.find().toArray();

        // Funzione per calcolare il punteggio
        const calculateScore = (performance) => {
            const { roi, win_rate, risk_level, stars } = performance;
            let riskScore = 0;

            // Converte il risk_level in valore numerico
            switch (risk_level) {
                case 'Basso':
                    riskScore = 1;
                    break;
                case 'Medio':
                    riskScore = 2;
                    break;
                case 'Alto':
                    riskScore = 3;
                    break;
                default:
                    riskScore = 2;  // Default to "Medio" if undefined
                    break;
            }

            // Calcoliamo una media ponderata dei tre valori
            return (roi + win_rate + (10 - riskScore) + stars) / 4;

        };

        // Aggiungiamo un campo "score" a ciascun EA per il punteggio calcolato
        const dataWithScores = data.map(ea => ({
            ...ea,
            score: calculateScore(ea.performance)
        }));

        // Ordiniamo per score in ordine decrescente e prendiamo i primi 5
        const topEAs = dataWithScores.sort((a, b) => b.score - a.score).slice(0, 4);

        // Restituiamo i 5 migliori EAs
        res.send(topEAs);

    } catch (err) {
        res.status(500).send('Internal server error: ' + err);

    } finally {
        client.close();
    }
});


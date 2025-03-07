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

// Funzioni per numeri casuali
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



// Endpoint per generare Expert Advisors casuali
app.get("/api/generateEAs", async (req:any, res:any) => {
  const N = parseInt(req.query.N as string) || 5; // Numero di EAs da generare (default 5)

  if (N <= 0) {
    return res
      .status(400)
      .json({ error: "Il numero di Expert Advisors deve essere maggiore di 0" });
  }

  const generateEA = () => {
    return {
      id: randomInt(1, 10000),
      name: dictionary.names[randomInt(0, dictionary.names.length - 1)],
      creator: dictionary.creators[randomInt(0, dictionary.creators.length - 1)],
      description:
        dictionary.descriptions[randomInt(0, dictionary.descriptions.length - 1)],
      performance: {
        roi: randomFloat(5, 50),
        risk_level: randomCase(1, 3),
        win_rate: randomInt(50, 95),
      },
      price: randomInt(50, 500),
      stars: randomInt(1, 5),
      reviews: randomInt(10, 500),
      image: `${dictionary.names[randomInt(0, dictionary.names.length - 1)]}.png`,
      historical_data: `${dictionary.names[randomInt(0, dictionary.names.length - 1)]}.json`,
    };
  };
  

  const generatedEAs = Array.from({ length: N }, generateEA);

  res.json({ status: "success", experts: generatedEAs });
});

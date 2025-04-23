"use strict";

import http from "http";
import fs from "fs";
import express, { NextFunction, Request, Response } from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/* ********************** MONGO CONFIG ********************* */
const connectionString = "mongodb://localhost:27017"; 
const DB_NAME = "ExpertAdvisor"; 

/* ********************** HTTP SERVER ********************** */
const port = 5000; 
const privateKey = fs.readFileSync("keys/private.pem", "utf8");
const certificate = fs.readFileSync("keys/certificate.crt", "utf8");
const JWT_SECRET = "supersegreto";
const EXPERTS_FILE = "./DB/experts.json";


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
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/DB", express.static(path.join(__dirname, "../DB")));

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
    const change = (roi / 100) * (winRate / 100) * (Math.random() * 2 - 1); 
    value += value * change;
    data.push(parseFloat(value.toFixed(2)));
  }

  return data;
}
app.get("/api/generateEAs", async (req: any, res: any) => {
  const N = parseInt(req.query.N as string) || 20;
  const filter = req.query.filter || "all";
  const search = req.query.search || "";

  if (N <= 0) {
    return res
      .status(400)
      .json({ error: "Il numero di Expert Advisors deve essere maggiore di 0" });
  }

  // Creiamo delle copie dei dati per evitare di modificarli direttamente
  let availableNames = [...dictionary.names];
  let availableCreators = [...dictionary.creators];
  let availableDescriptions = [...dictionary.descriptions];

  const generateEA = () => {
    if (availableNames.length === 0 || availableCreators.length === 0 || availableDescriptions.length === 0) {
      return null; // Nessun dato disponibile, interrompi la generazione
    }

    const roi = randomFloat(5, 50);
    const winRate = randomInt(50, 95);

    const nameIndex = randomInt(0, availableNames.length - 1);
    const creatorIndex = randomInt(0, availableCreators.length - 1);
    const descriptionIndex = randomInt(0, availableDescriptions.length - 1);

    const name = availableNames.splice(nameIndex, 1)[0]; // Rimuove e ottiene il nome
    const creator = availableCreators.splice(creatorIndex, 1)[0]; // Rimuove e ottiene il creatore
    const description = availableDescriptions.splice(descriptionIndex, 1)[0]; // Rimuove e ottiene la descrizione

    return {
      id: randomInt(1, 10000),
      name,
      creator,
      description,
      performance: {
        roi: roi,
        risk_level: randomCase(1, 3),
        win_rate: winRate,
        data: generatePerformanceData(roi, winRate),
      },
      price: randomInt(0, 20),
      stars: randomInt(1, 5),
      reviews: randomInt(10, 500),
      image: `${name}.png`, // Assegna direttamente il nome dell'EA come immagine
      historical_data: `${name}.json`,
    };
  };

  let generatedEAs = [];
  for (let i = 0; i < N; i++) {
    const ea = generateEA();
    if (ea) {
      generatedEAs.push(ea);
    } else {
      break; // Esce se non ci sono più dati disponibili
    }
  }

  // Filtraggio
  if (filter === "popular") {
    generatedEAs = generatedEAs.sort((a, b) => b.stars - a.stars);
  } else if (filter === "new") {
    generatedEAs = generatedEAs.sort((a, b) => b.id - a.id);
  } else if (filter === "free") {
    generatedEAs = generatedEAs.filter(ea => ea.price === 0);
  } else if (filter === "paid") {
    generatedEAs = generatedEAs.filter(ea => ea.price > 0);
  }

  // Ricerca
  if (search) {
    generatedEAs = generatedEAs.filter(ea => ea.name.toLowerCase().includes(search.toLowerCase()));
  }

  fs.writeFile("./DB/experts.json", JSON.stringify(generatedEAs, null, 2), (err) => {
    if (err) {
      console.error("Errore nel salvataggio degli Expert Advisors:", err);
      return res.status(500).json({ error: "Errore nel salvataggio degli Expert Advisors" });
    }
    res.json({ status: "success", experts: generatedEAs });
  });
});

app.get("/api/generateEAHtml/:id", (req: any, res: any) => {
  res.sendFile(path.join(__dirname, "../public/ea.html"));
});

app.get("/api/generateEAData/:id", (req: any, res: any) => {
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

    const firstValue = ea.performance.data[0];
    const lastValue = ea.performance.data[ea.performance.data.length - 1];
    let gain = (lastValue - firstValue) / firstValue * 100;
    gain = parseFloat(gain.toFixed(2));

    const calculateWinRate = (data: number[]): number => {
      let winningTrades = 0;
      for (let i = 0; i < data.length - 1; i++) {
        if (data[i] < data[i + 1]) {
          winningTrades++;
        }
      }
      const winRate = (winningTrades / (data.length - 1)) * 100;
      return winRate;
    };

    const calculateDrawdown = (data: number[]): number => {
      let peak = data[0];
      let maxDrawdown = 0;
      for (let i = 1; i < data.length; i++) {
        if (data[i] > peak) {
          peak = data[i];
        }
        const drawdown = (peak - data[i]) / peak * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      return maxDrawdown;
    };

    const drawdown = calculateDrawdown(ea.performance.data);
    let winRate = calculateWinRate(ea.performance.data);
    winRate = parseFloat(winRate.toFixed(2));

    const averagePerformance = ea.performance.data.reduce((sum: number, value: number) => sum + value, 0) / ea.performance.data.length;
    const numberOfTrades = ea.performance.data.length - 1;

    const calculateSharpeRatio = (data: number[], riskFreeRate: number): number => {
      const dailyReturns: number[] = [];
      for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i] - data[i - 1]) / data[i - 1];
        dailyReturns.push(dailyReturn);
      }
      const averageReturn = dailyReturns.reduce((acc, value) => acc + value, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((acc, value) => acc + Math.pow(value - averageReturn, 2), 0) / dailyReturns.length;
      const volatility = Math.sqrt(variance);
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

    res.json({
      name: ea.name,
      creator: ea.creator,
      description: ea.description,
      price: ea.price,
      stars: ea.stars,
      reviews: ea.reviews,
      gain,
      performance: {
        risk_level: ea.performance.risk_level,
        data: ea.performance.data,
        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`)
      },
      winRate,
      averagePerformance,
      drawdown,
      numberOfTrades,
      sharpeRatio,
      totalProfitPercentage
    });
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
  // Rotta di registrazione (signup)
app.post("/api/signup", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username e password sono obbligatori." });
  }

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection("users");

    // Verifica se l'utente esiste già
    const existingUser = await collection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Utente già registrato." });
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salva l'utente nel database
    const newUser = { username, password: hashedPassword };
    await collection.insertOne(newUser);

    res.status(201).json({ message: "Registrazione completata con successo." });
  } catch (err) {
    console.error("Errore durante la registrazione:", err);
    res.status(500).json({ error: "Errore interno del server." });
  } finally {
    await client.close();
  }
});

// Rotta di login
app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username e password sono obbligatori." });
  }

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection("users");

    // Trova l'utente
    const user = await collection.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    // Verifica la password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    // Genera il token JWT
    const token = jwt.sign({ id: user._id, username: user.username }, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
    });

    res.json({ message: "Login effettuato con successo.", token });
  } catch (err) {
    console.error("Errore durante il login:", err);
    res.status(500).json({ error: "Errore interno del server." });
  } finally {
    await client.close();
  }
});
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Accesso negato. Token mancante." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Token non valido." });
    }
    (req as any).user = user;
    next();
  });
}
});

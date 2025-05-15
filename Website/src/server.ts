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
import dotenv from "dotenv";

// Carica le variabili di ambiente dal file .env
dotenv.config();

/* ********************** MONGO CONFIG ********************* */
const connectionString = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

/* ********************** HTTP SERVER ********************** */
const port = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;

let paginaErrore: string;
const app = express();
const server = http.createServer(app);

server.listen(port, () => {
  init();
  console.log(`Server in esecuzione su http://localhost:${port}`);
});

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

app.use(express.static(path.join(__dirname, "../public")));

/* ********************** API PER GLI EXPERT ADVISOR ********************** */

// Rotta per ottenere tutti gli Expert Advisor dal database
app.get("/api/experts", async (req: Request, res: Response) => {
  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection("expertAdvisors");

    const experts = await collection.find({}).toArray();
    res.json({ status: "success", experts });
  } catch (err) {
    console.error("Errore nel recupero degli Expert Advisors:", err);
    res.status(500).json({ error: "Errore interno del server." });
  } finally {
    await client.close();
  }
});

// Rotta per ottenere un Expert Advisor specifico
app.get("/api/experts/:id", async (req: Request, res: Response) => {
  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection("expertAdvisors");

    // Converti l'ID passato nella richiesta in un numero
    const id = parseInt(req.params.id, 10);

    // Cerca l'Expert Advisor utilizzando il campo `id` numerico
    const expert = await collection.findOne({ id: id });
    if (!expert) {
      return res.status(404).json({ error: "Expert Advisor non trovato." });
    }

    res.json({ status: "success", expert });
  } catch (err) {
    console.error("Errore nel recupero dell'Expert Advisor:", err);
    res.status(500).json({ error: "Errore interno del server." });
  } finally {
    await client.close();
  }
});
app.post("/api/register", async (req: Request, res: Response) => {
  const client = new MongoClient(connectionString);
  const { username, email, password, purchasedEAs } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
  }

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection("users");

    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email già registrata." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      purchasedEAs: purchasedEAs || [],
      createdAt: new Date(),
    };
    const result = await collection.insertOne(newUser);

    const token = jwt.sign(
      { id: result.insertedId, email, username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({ message: "Utente registrato con successo.", token });
  } catch (err) {
    console.error("Errore durante la registrazione:", err);
    res.status(500).json({ error: "Errore interno del server." });
  } finally {
    await client.close();
  }
});
app.post("/api/login", async (req: Request, res: Response) => {
  const client = new MongoClient(connectionString);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
  }

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection("users");

    const user = await collection.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login avvenuto con successo.", token });
  } catch (err) {
    console.error("Errore durante il login:", err);
    res.status(500).json({ error: "Errore interno del server." });
  } finally {
    await client.close();
  }
});
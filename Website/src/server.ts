"use strict";

// **********************************************
// *        TRADEFLOW - SERVER PRINCIPALE        *
// **********************************************

// ================== IMPORTAZIONI ==================

// Moduli core e terze parti
import http from "http";
import fs from "fs";
import express, { NextFunction, Request, Response } from "express";
import { MongoClient, ObjectId } from "mongodb";

// Espansione dell'interfaccia Request per aggiungere l'utente autenticato
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}
import cors from "cors";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from 'dotenv';
import Stripe from 'stripe';

// ================== CONFIGURAZIONE AMBIENTE ==================

// Carica le variabili di ambiente dal file .env
dotenv.config();

// Controllo presenza chiave Stripe
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

// Inizializza Stripe con la chiave segreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ================== CONFIGURAZIONE MONGO ==================

// Stringa di connessione e nome database da variabili ambiente
const connectionString = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

// ================== CONFIGURAZIONE SERVER HTTP ==================

// Porta e segreto JWT da variabili ambiente
const port = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;

// Variabile per la pagina di errore
let paginaErrore: string;

// Inizializzazione di Express e del server HTTP
const app = express();
const server = http.createServer(app);

// Avvio del server
server.listen(port, () => {
  init();
  console.log(`Server in esecuzione su http://localhost:${port}`);
});

// Caricamento pagina di errore personalizzata
function init() {
  fs.readFile("./static/error.html", (err, data) => {
    if (!err) {
      paginaErrore = data.toString();
    } else {
      paginaErrore = "<h1>Risorsa non trovata</h1>";
    }
  });
}

// ================== MIDDLEWARE ==================

// Log di tutte le richieste in ingresso
app.use("/", (req: Request, res: Response, next: NextFunction) => {
  console.log(req.method + ": " + req.originalUrl);
  next();
});

// Middleware per servire file statici e gestire payload grandi
app.use("/", express.static("./static"));
app.use("/", express.json({ limit: "10mb" }));
app.use("/", express.urlencoded({ limit: "10mb", extended: true }));
app.use("/", fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } }));

// Log dei parametri GET e BODY per debug
app.use("/", (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    console.log("--> GET params: " + JSON.stringify(req.query));
  }
  if (Object.keys(req.body).length > 0) {
    console.log("--> BODY params: " + JSON.stringify(req.body));
  }
  next();
});

// Configurazione CORS per permettere richieste cross-origin
const corsOptions = {
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true,
};
app.use("/", cors(corsOptions));

// Middleware aggiuntivi per parsing e upload file
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/DB", express.static(path.join(__dirname, "../DB")));
app.use(express.static(path.join(__dirname, "../public")));

// CORS globale per tutte le rotte
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ================== AUTENTICAZIONE JWT ==================

// Middleware per autenticare le richieste tramite JWT
function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Token required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { username: string, id: string };
        req.user = { username: decoded.username, id: decoded.id };
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ 
                error: "Token scaduto",
                code: "TOKEN_EXPIRED"
            });
        }
        return res.status(403).json({ error: "Invalid token" });
    }
}

// =========================================================
// =============== API EXPERT ADVISOR ======================
// =========================================================

/*
    Rotta per ottenere tutti gli EA pubblicati dall'utente autenticato.
    - Richiede autenticazione JWT.
    - Restituisce solo gli EA creati dall'utente corrente.
*/
app.get("/api/experts/user", authenticateToken, async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);

    try {
        await client.connect();
        const collection = client.db(DB_NAME).collection("expertAdvisors");
        
        console.log("Cercando EA per creator:", req.user.username); // Debug log

        const experts = await collection
            .find({ creator: req.user.username })
            .toArray();

        console.log("EA trovati:", experts.length); // Debug log
        res.json(experts);

    } catch (err) {
        console.error("Error fetching user's EAs:", err);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
});

/*
    Rotta per ottenere tutti gli Expert Advisor dal database.
    - Nessuna autenticazione richiesta.
    - Restituisce tutti gli EA disponibili.
*/
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

/*
    Rotta per ottenere un Expert Advisor specifico tramite ID numerico.
    - Nessuna autenticazione richiesta.
    - Restituisce i dettagli dell'EA richiesto.
*/
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

// =========================================================
// =============== API AUTENTICAZIONE UTENTE ===============
// =========================================================

/*
    Rotta per la registrazione di un nuovo utente.
    - Richiede username, email e password.
    - Salva l'utente nel database con password hashata.
    - Restituisce un token JWT.
*/
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

/*
    Rotta per il login utente.
    - Richiede email e password.
    - Verifica le credenziali e restituisce un token JWT.
*/
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
      { expiresIn: "24h" } 
    );

    res.status(200).json({ message: "Login avvenuto con successo.", token });
  } catch (err) {
    console.error("Errore durante il login:", err);
    res.status(500).json({ error: "Errore interno del server." });
  } finally {
    await client.close();
  }
});

// =========================================================
// =============== API PAGAMENTI E ACQUISTI ================
// =========================================================

/*
    Endpoint per verificare se un EA è già stato acquistato dall'utente.
    - Richiede autenticazione JWT.
    - Restituisce true/false.
*/
app.get("/api/payments/check/:eaId", async (req: Request, res: Response) => {
  const client = new MongoClient(connectionString);
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
      return res.status(401).json({ error: "Token non fornito" });
  }

  try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      await client.connect();
      const collection = client.db(DB_NAME).collection("payments");

      const payment = await collection.findOne({
          userId: new ObjectId(decoded.id),
          eaId: parseInt(req.params.eaId),
          status: "completed"
      });

      res.json({ purchased: !!payment });
  } catch (err) {
      console.error("Errore nella verifica dell'acquisto:", err);
      res.status(500).json({ error: "Errore interno del server" });
  } finally {
      await client.close();
  }
});

/*
    Endpoint per creare un nuovo acquisto (pagamento "fake").
    - Richiede autenticazione JWT.
    - Inserisce uno o più pagamenti nella collection "payments".
    - Usato per test o demo senza Stripe reale.
*/
app.post("/api/payments/create", async (req: Request, res: Response) => {
  const client = new MongoClient(connectionString);
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
      return res.status(401).json({ error: "Token non fornito" });
  }

  try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      await client.connect();
      const paymentsCollection = client.db(DB_NAME).collection("payments");

      const { items } = req.body;

      // Verifica che tutti gli items siano validi
      if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: "Carrello non valido" });
      }

      // Crea i documenti di pagamento
      const paymentDocs = items.map(item => ({
          userId: new ObjectId(decoded.id),
          eaId: item.eaId,
          price: item.price,
          purchaseDate: new Date(),
          status: "completed"
      }));

      // Inserisci tutti i pagamenti
      const result = await paymentsCollection.insertMany(paymentDocs);

      if (result.insertedCount === items.length) {
          res.json({ 
              message: "Pagamento completato con successo",
              payments: result.insertedIds
          });
      } else {
          // Se qualcosa è andato storto, elimina i pagamenti inseriti
          await paymentsCollection.deleteMany({
              _id: { $in: Object.values(result.insertedIds) }
          });
          throw new Error("Errore nell'inserimento dei pagamenti");
      }
  } catch (err) {
      console.error("Errore nella creazione del pagamento:", err);
      res.status(500).json({ error: "Errore interno del server" });
  } finally {
      await client.close();
  }
});

/*
    Endpoint per ottenere tutti gli EA acquistati dall'utente autenticato.
    - Restituisce la lista degli EA associati ai pagamenti completati.
*/
app.get("/api/payments/purchased", async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Token non fornito" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        await client.connect();
        const db = client.db(DB_NAME);

        const payments = await db.collection("payments")
            .find({
                userId: new ObjectId(decoded.id),
                status: "completed",
                eaId: { $type: "number" } // Solo pagamenti con eaId valido
            })
            .toArray();

        if (payments.length === 0) {
            return res.json([]);
        }

        const eaIds = payments.map(p => p.eaId).filter(id => !isNaN(id));
        
        const eas = await db.collection("expertAdvisors")
            .find({
                id: { $in: eaIds }
            })
            .toArray();

        console.log("Found EAs:", eas);
        res.json(eas);

    } catch (err) {
        console.error("Errore nel recupero degli EA acquistati:", err);
        res.status(500).json({ error: "Errore interno del server" });
    } finally {
        await client.close();
    }
});

/*
    Endpoint per cambiare la password dell'utente autenticato.
    - Richiede la password attuale e quella nuova.
    - Aggiorna la password nel database dopo verifica.
*/
app.post("/api/users/change-password", async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Token non fornito" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
        }

        await client.connect();
        const collection = client.db(DB_NAME).collection("users");

        // Trova l'utente per ID
        const user = await collection.findOne({ _id: new ObjectId(decoded.id) });
        if (!user) {
            return res.status(404).json({ error: "Utente non trovato" });
        }

        // Verifica la password attuale
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Password attuale non corretta" });
        }

        // Hash della nuova password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Aggiorna la password nel database
        await collection.updateOne(
            { _id: new ObjectId(decoded.id) },
            { $set: { password: hashedNewPassword } }
        );

        res.json({ message: "Password aggiornata con successo" });
    } catch (err) {
        console.error("Errore nel cambio password:", err);
        res.status(500).json({ error: "Errore interno del server" });
    } finally {
        await client.close();
    }
});

// =========================================================
// =============== API PAGAMENTO REALE STRIPE ==============
// =========================================================

/*
    Endpoint per creare una sessione di pagamento Stripe.
    - Salva temporaneamente il carrello.
    - Crea una sessione Stripe Checkout.
    - Restituisce l'id della sessione.
*/
app.post("/api/payment/create-intent", async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ error: "Token non fornito" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        const { items } = req.body;
        
        // Salva gli articoli del carrello in una collezione temporanea
        await client.connect();
        const tempCartCollection = client.db(DB_NAME).collection("tempCart");
        
        // Salva gli articoli del carrello con un sessionId temporaneo
        const tempSessionId = new ObjectId().toString();
        await tempCartCollection.insertOne({
            sessionId: tempSessionId,
            userId: decoded.id,
            items: items,
            createdAt: new Date()
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items.map((item: any) => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: 1,
            })),
            metadata: {
                tempSessionId: tempSessionId,
                userId: decoded.id
            },
            mode: 'payment',
            success_url: `http://localhost:3000/api/payments/confirm?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: 'http://localhost:3000/payment.html'
        });

        res.json({ id: session.id });
    } catch (err) {
        console.error("Errore nella creazione del payment intent:", err);
        res.status(500).json({ error: "Errore interno del server" });
    } finally {
        await client.close();
    }
});

/*
    Endpoint per confermare il pagamento Stripe.
    - Recupera la sessione Stripe.
    - Se pagato, salva i pagamenti nel database.
    - Pulisce il carrello temporaneo.
    - Redirige l'utente alla dashboard o alla pagina di errore.
*/
app.get("/api/payments/confirm", async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const sessionId = req.query.session_id as string;

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid') {
            await client.connect();
            const db = client.db(DB_NAME);
            const paymentsCollection = db.collection("payments");
            const tempCartCollection = db.collection("tempCart");

            // Ricerca il carrello temporaneo associato alla sessione
            const tempCart = await tempCartCollection.findOne({
                sessionId: session.metadata?.tempSessionId
            });

            if (!tempCart) {
                throw new Error('Cart data not found');
            }

            // Crea record separati per ogni articolo acquistato
            const paymentDocs = tempCart.items.map((item: any) => ({
                userId: new ObjectId(session.metadata?.userId),
                eaId: parseInt(item.id),
                price: item.price,
                purchaseDate: new Date(),
                status: "completed",
                stripeSessionId: session.id,
                itemName: item.name
            }));

            await paymentsCollection.insertMany(paymentDocs);
            
            // Pulisci il carrello temporaneo
            await tempCartCollection.deleteOne({
                sessionId: session.metadata?.tempSessionId
            });

            res.redirect('/dashboard.html?payment=success');
        } else {
            res.redirect('/payment.html?error=payment_failed');
        }
    } catch (err) {
        console.error("Errore nella conferma del pagamento:", err);
        res.redirect('/payment.html?error=payment_failed');
    } finally {
        await client.close();
    }
});

// =========================================================
// =============== API CREAZIONE/ELIMINAZIONE EA ===========
// =========================================================

/*
    Endpoint per creare un nuovo Expert Advisor.
    - Richiede autenticazione JWT.
    - Genera un nuovo ID incrementale.
    - Salva l'EA nel database.
*/
app.post("/api/experts/create", async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Token non fornito" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
        await client.connect();
        const collection = client.db(DB_NAME).collection("expertAdvisors");

        // Genera nuovo ID unico
        const lastEA = await collection.findOne({}, { sort: { id: -1 } });
        const newId = (lastEA?.id || 0) + 1;

        const eaData = {
            ...req.body,
            id: newId,
            creator: decoded.username
        };

        await collection.insertOne(eaData);
        res.status(201).json({ message: "Expert Advisor creato con successo", id: newId });
    } catch (err) {
        console.error("Errore nella creazione dell'EA:", err);
        res.status(500).json({ error: "Errore interno del server" });
    } finally {
        await client.close();
    }
});

/*
    Endpoint per eliminare un Expert Advisor pubblicato dall'utente.
    - Richiede autenticazione JWT.
    - Verifica che l'EA appartenga all'utente.
    - Elimina l'EA dal database.
*/
app.delete("/api/experts/:id", async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Token non fornito" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
        await client.connect();
        const collection = client.db(DB_NAME).collection("expertAdvisors");

        const id = parseInt(req.params.id);
        
        // Verifica che l'EA esista e appartenga all'utente
        const ea = await collection.findOne({ id, creator: decoded.username });
        if (!ea) {
            return res.status(404).json({ error: "Expert Advisor non trovato o non autorizzato" });
        }

        await collection.deleteOne({ id });
        res.json({ message: "Expert Advisor eliminato con successo" });
    } catch (err) {
        console.error("Errore nell'eliminazione dell'EA:", err);
        res.status(500).json({ error: "Errore interno del server" });
    } finally {
        await client.close();
    }
});

/*
    Endpoint per votare un Expert Advisor.
    - Richiede autenticazione JWT.
    - Aggiorna la media delle stelle e il numero di recensioni.
*/
app.post("/api/experts/:id/rate", authenticateToken, async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Invalid rating" });
    }

    try {
        await client.connect();
        const collection = client.db(DB_NAME).collection("expertAdvisors");
        
        const ea = await collection.findOne({ id: parseInt(id) });
        if (!ea) {
            return res.status(404).json({ error: "EA not found" });
        }

        // Calcola la nuova media delle stelle
        const currentTotal = ea.stars * ea.reviews;
        const newTotal = currentTotal + rating;
        const newReviews = ea.reviews + 1;
        const newAverageRating = newTotal / newReviews;

        // Aggiorna il documento
        await collection.updateOne(
            { id: parseInt(id) },
            { 
                $set: { 
                    stars: newAverageRating,
                    reviews: newReviews
                }
            }
        );

        res.json({ 
            success: true, 
            newAverageRating,
            newReviews 
        });
    } catch (err) {
        console.error("Error rating EA:", err);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
});

// =========================================================
// =============== API MESSAGGI CONTATTI ===================
// =========================================================

/*
    Endpoint per inviare un messaggio allo staff.
    - Richiede nome, email e messaggio.
    - Salva il messaggio nella collection "messages".
*/
app.post("/api/messages", async (req: Request, res: Response) => {
    const client = new MongoClient(connectionString);
    const { name, email, message } = req.body;

    // Validazione
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    try {
        await client.connect();
        const collection = client.db(DB_NAME).collection("messages");
        
        const newMessage = {
            name,
            email,
            message,
            date: new Date(),
            status: "unread" // per gestire lo stato dei messaggi
        };

        await collection.insertOne(newMessage);
        res.status(201).json({ message: "Messaggio inviato con successo" });
    } catch (err) {
        console.error("Errore nell'invio del messaggio:", err);
        res.status(500).json({ error: "Errore interno del server" });
    } finally {
        await client.close();
    }
});

// ================== FINE SERVER ==================


import express from 'express';
import url from 'url';
import fs from 'fs';
import fileUpload from 'express-fileupload';
import { MongoClient, ObjectId } from 'mongodb';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());

// Variabile per memorizzare i dati ricevuti
let receivedData: Record<string, any> = {};

// Endpoint POST per ricevere i dati
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

app.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
});

// ==========================================================
// ========== SCRIPT PER GENERARE EXPERT ADVISOR FAKE =======
// ==========================================================

// Importa il modulo fs per la gestione dei file
import fs from "fs";

// ================== FUNZIONI DI UTILITÀ ==================

/**
 * Restituisce un intero casuale tra min e max (inclusi)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Restituisce un float casuale tra min e max con due decimali
 */
function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

/**
 * Genera una serie di dati di performance per un EA
 * @param days Numero di giorni di dati da generare
 * @param roi Ritorno sull'investimento (percentuale)
 * @param winRate Percentuale di operazioni vincenti
 * @returns Array di valori di performance giornalieri
 */
function generatePerformanceData(days: number, roi: number, winRate: number): number[] {
  const data = [];
  let value = 5000; // Valore iniziale

  for (let i = 0; i < days; i++) {
    // Variazione casuale basata su ROI e win rate
    const change = (roi / 100) * (winRate / 100) * (Math.random() * 2 - 1);
    value += value * change;
    data.push(parseFloat(value.toFixed(2)));
  }

  return data;
}

/**
 * Restituisce un livello di rischio casuale tra "Basso", "Medio", "Alto"
 */
function randomRiskLevel(): string {
  const levels = ["Basso", "Medio", "Alto"];
  return levels[randomInt(0, levels.length - 1)];
}

// ================== GENERAZIONE EXPERT ADVISOR ==================

/**
 * Genera una lista di Expert Advisor fake
 * @param count Numero di EA da generare
 * @param names Array di nomi disponibili
 * @param creators Array di creatori disponibili
 * @param descriptions Array di descrizioni disponibili
 * @returns Array di oggetti Expert Advisor
 */
function generateExpertAdvisors(
  count: number,
  names: string[],
  creators: string[],
  descriptions: string[]
): any[] {
  const experts = [];

  for (let i = 0; i < count; i++) {
    // Controlla che ci siano ancora dati disponibili nei dizionari
    if (names.length === 0 || creators.length === 0 || descriptions.length === 0) {
      console.error("Non ci sono abbastanza dati nei dizionari per generare altri Expert Advisor.");
      break;
    }

    const days = randomInt(30, 365); // Numero di giorni di dati di performance
    const roi = randomFloat(5, 50); // ROI percentuale
    const winRate = randomInt(50, 95); // Percentuale di win rate

    // Estrai un nome, un creatore e una descrizione unici (li rimuove dagli array)
    const name = names.splice(randomInt(0, names.length - 1), 1)[0];
    const creator = creators.splice(randomInt(0, creators.length - 1), 1)[0];
    const description = descriptions.splice(randomInt(0, descriptions.length - 1), 1)[0];

    experts.push({
      id: randomInt(1, 10000), // ID casuale
      name,
      creator,
      description,
      price: randomInt(0, 2000), // Prezzo casuale tra 0 e 2000
      stars: randomInt(1, 5), // Stelle casuali tra 1 e 5
      reviews: randomInt(10, 500), // Numero di recensioni casuale
      performance: {
        roi,
        risk_level: randomRiskLevel(),
        win_rate: winRate,
        data: generatePerformanceData(days, roi, winRate),
      },
      image: `${name.replace(/\s+/g, "_").toLowerCase()}.png`, // Nome file immagine
      historical_data: `${name.replace(/\s+/g, "_").toLowerCase()}.json`, // Nome file dati storici
    });
  }

  return experts;
}

// ================== SALVATAGGIO SU FILE ==================

/**
 * Salva la lista di Expert Advisor in un file JSON
 * @param experts Array di Expert Advisor da salvare
 * @param filePath Percorso del file di destinazione
 */
function saveExpertsToFile(experts: any[], filePath: string) {
  fs.writeFile(filePath, JSON.stringify(experts, null, 2), (err) => {
    if (err) {
      console.error("Errore durante il salvataggio degli Expert Advisor:", err);
    } else {
      console.log(`✅ Expert Advisor salvati con successo in ${filePath}`);
    }
  });
}

// ================== AVVIO DELLO SCRIPT ==================

// Leggi i dizionari di nomi, creatori e descrizioni dal file JSON
const dictionaries = JSON.parse(fs.readFileSync("./DB/dictionaries.json", "utf8"));
const names = dictionaries.names;
const creators = dictionaries.creators;
const descriptions = dictionaries.descriptions;

// Genera gli Expert Advisor fake
const experts = generateExpertAdvisors(50, names, creators, descriptions);

// Salva gli Expert Advisor generati nel file di destinazione
saveExpertsToFile(experts, "./DB/experts.json");
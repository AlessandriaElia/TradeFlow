import fs from "fs";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generatePerformanceData(days: number, roi: number, winRate: number): number[] {
  const data = [];
  let value = 5000; // Starting value

  for (let i = 0; i < days; i++) {
    const change = (roi / 100) * (winRate / 100) * (Math.random() * 2 - 1); // Random variation
    value += value * change;
    data.push(parseFloat(value.toFixed(2)));
  }

  return data;
}

function randomRiskLevel(): string {
  const levels = ["Basso", "Medio", "Alto"];
  return levels[randomInt(0, levels.length - 1)];
}

function generateExpertAdvisors(
  count: number,
  names: string[],
  creators: string[],
  descriptions: string[]
): any[] {
  const experts = [];

  for (let i = 0; i < count; i++) {
    if (names.length === 0 || creators.length === 0 || descriptions.length === 0) {
      console.error("Non ci sono abbastanza dati nei dizionari per generare altri Expert Advisor.");
      break;
    }

    const days = randomInt(30, 365); // Number of days for performance data
    const roi = randomFloat(5, 50); // ROI percentage
    const winRate = randomInt(50, 95); // Win rate percentage

    // Estrai un nome, un creatore e una descrizione unici
    const name = names.splice(randomInt(0, names.length - 1), 1)[0];
    const creator = creators.splice(randomInt(0, creators.length - 1), 1)[0];
    const description = descriptions.splice(randomInt(0, descriptions.length - 1), 1)[0];

    experts.push({
      id: randomInt(1, 10000),
      name,
      creator,
      description,
      price: randomInt(0, 2000),
      stars: randomInt(1, 5),
      reviews: randomInt(10, 500),
      performance: {
        roi,
        risk_level: randomRiskLevel(),
        win_rate: winRate,
        data: generatePerformanceData(days, roi, winRate),
      },
      image: `${name.replace(/\s+/g, "_").toLowerCase()}.png`,
      historical_data: `${name.replace(/\s+/g, "_").toLowerCase()}.json`,
    });
  }

  return experts;
}

function saveExpertsToFile(experts: any[], filePath: string) {
  fs.writeFile(filePath, JSON.stringify(experts, null, 2), (err) => {
    if (err) {
      console.error("Errore durante il salvataggio degli Expert Advisor:", err);
    } else {
      console.log(`✅ Expert Advisor salvati con successo in ${filePath}`);
    }
  });
}

// Leggi i dizionari dai file
const dictionaries = JSON.parse(fs.readFileSync("./DB/dictionaries.json", "utf8"));
const names = dictionaries.names;
const creators = dictionaries.creators;
const descriptions = dictionaries.descriptions;

// Genera gli Expert Advisor
const experts = generateExpertAdvisors(50, names, creators, descriptions);

// Salva gli Expert Advisor nel file
saveExpertsToFile(experts, "./DB/experts.json");
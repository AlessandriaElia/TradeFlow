# Importazione librerie necessarie
import requests  # Per le richieste HTTP
import csv      # Per gestione file CSV
import os       # Per operazioni sul filesystem
import pandas as pd  # Per analisi dati
import getpass  # Per ottenere username Windows

# Valori nominali dei contratti in USD
# Questi valori rappresentano il "peso" effettivo di ogni contratto future
CONTRACT_NOTIONAL = {
    "AUD": 100000,   # 1 contratto AUD = 100,000 USD
    "CAD": 100000,   # 1 contratto CAD = 100,000 USD
    "CHF": 125000,   # 1 contratto CHF = 125,000 USD
    "EUR": 125000,   # 1 contratto EUR = 125,000 USD
    "GBP": 62500,    # 1 contratto GBP = 62,500 USD
    "JPY": 12500000/100,  # JPY normalizzato per allinearlo alle altre valute
    "NZD": 100000,   # 1 contratto NZD = 100,000 USD
    "USD": 1000      # USD Index ha un valore minore
}

# Massimi delta storici per normalizzazione
# Questi valori sono usati per normalizzare i delta su scala -10/+10
# Calcolati come: (max contratti storici * valore nominale)
MAX_HISTORICAL_DELTAS = {
    "AUD": 1000000000,  # 10,000 contratti * 100,000 USD
    "CAD": 1000000000,  # 10,000 contratti * 100,000 USD
    "CHF": 1250000000,  # 10,000 contratti * 125,000 USD
    "EUR": 1250000000,  # 10,000 contratti * 125,000 USD
    "GBP": 625000000,   # 10,000 contratti * 62,500 USD
    "JPY": 1250000000,  # 10,000 contratti * 125,000 USD (normalized)
    "NZD": 1000000000,  # 10,000 contratti * 100,000 USD
    "USD": 10000000     # 10,000 contratti * 1,000 USD
}

# Mappatura tra nomi completi e simboli delle valute
# Necessario per collegare i dati CFTC ai simboli standard
currency_mapping = {
    "AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE": "AUD",
    "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE": "GBP",
    "CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE": "CAD",
    "EURO FX - CHICAGO MERCANTILE EXCHANGE": "EUR",
    "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE": "JPY",
    "SWISS FRANC - CHICAGO MERCANTILE EXCHANGE": "CHF",
    "USD INDEX - ICE FUTURES U.S.": "USD",
    "NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE": "NZD"
}

# Lista delle coppie forex principali da analizzare
MAJOR_PAIRS = [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"
]

# Configurazione per il download dei dati CFTC
url = "https://www.cftc.gov/dea/newcot/deafut.txt"
output_txt = "COT_Report.txt"
output_csv = "COT_Report.csv"

def download_and_convert():
    """
    Scarica e converte i dati COT da TXT a CSV.
    Efficiente perché:
    1. Scarica solo una volta i dati
    2. Elimina il file temporaneo dopo l'uso
    3. Gestisce gli errori di download
    """
    print("Scaricando il file TXT...")
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_txt, "wb") as file:
            file.write(response.content)
        print(f"File TXT scaricato con successo: {output_txt}")
    else:
        print(f"Errore nel download: {response.status_code}")
        exit()

    print("Convertendo il file TXT in CSV...")
    with open(output_txt, "r") as txt_file, open(output_csv, "w", newline="") as csv_file:
        reader = csv.reader(txt_file, delimiter=",")
        writer = csv.writer(csv_file)
        for row in reader:
            writer.writerow(row)

    os.remove(output_txt)
    print("Pulizia completata.")

# Range storici per ogni valuta
# Questi valori sono basati su anni di backtest e rappresentano 
# le soglie significative per ogni valuta
CURRENCY_RANGES = {
    "AUD": {
        "positive": {"low": (0, 5266.45), "medium": (5266.45, 10536.5), "high": 10536.5},
        "negative": {"low": (-4116.26, -1), "medium": (-9555.62, -4116.26), "high": -9555.62}
    },
    "CAD": {
        "positive": {"low": (0, 5286.64), "medium": (5286.64, 12777.62), "high": 12777.62},
        "negative": {"low": (-5041.2, -1), "medium": (-12163.68, -5041.2), "high": -12163.68}
    },
    "CHF": {
        "positive": {"low": (0, 822.3), "medium": (822.3, 2705.64), "high": 2705.64},
        "negative": {"low": (-1765.72, -1), "medium": (-3815.56, -1765.72), "high": -3815.56}
    },
    "EUR": {
        "positive": {"low": (0, 8045.12), "medium": (8045.12, 14254.48), "high": 14254.48},
        "negative": {"low": (-6282.6, -1), "medium": (-18102.4, -6282.6), "high": -18102.4}
    },
    "GBP": {
        "positive": {"low": (0, 6175.88), "medium": (6175.88, 13982.2), "high": 13982.2},
        "negative": {"low": (-5972.6, -1), "medium": (-15947.24, -5972.6), "high": -15947.24}
    },
    "JPY": {
        "positive": {"low": (0, 11200.6), "medium": (11200.6, 24151.84), "high": 24151.84},
        "negative": {"low": (-6402.52, -1), "medium": (-13879.6, -6402.52), "high": -13879.6}
    },
    "NZD": {
        "positive": {"low": (0, 2557.26), "medium": (2557.26, 4250.02), "high": 4250.02},
        "negative": {"low": (-1946.8, -1), "medium": (-4773.2, -1946.8), "high": -4773.2}
    },
    "USD": {
        "positive": {"low": (0, 579), "medium": (579, 1271.44), "high": 1271.44},
        "negative": {"low": (-684.88, -1), "medium": (-1270.68, -684.88), "high": -1270.68}
    }
}

def classify_delta_tot(currency_symbol, delta_tot):
    """
    Classifica il delta usando i range storici.
    Vantaggi:
    1. Tiene conto della storia specifica di ogni valuta
    2. Range calibrati su dati reali
    """
    ranges = CURRENCY_RANGES[currency_symbol]
    if delta_tot > 0:
        if delta_tot <= ranges["positive"]["low"][1]:
            return "🟡 BASSO POSITIVO"
        elif delta_tot <= ranges["positive"]["medium"][1]:
            return "🟨 MEDIO POSITIVO"
        else:
            return "⭐ ALTO POSITIVO"
    else:
        if delta_tot >= ranges["negative"]["low"][0]:
            return "🔵 BASSO NEGATIVO"
        elif delta_tot >= ranges["negative"]["medium"][0]:
            return "🔴 MEDIO NEGATIVO"
        else:
            return "❌ ALTO NEGATIVO"

# Configurazione range percentuali per la classificazione ponderata
# Questi valori sono calibrati per riflettere l'impatto relativo dei cambiamenti
CURRENCY_RANGES_PERCENT = {
    "AUD": {"positive": {"low": (0, 3), "medium": (3, 7), "high": 7},
            "negative": {"low": (-3, 0), "medium": (-7, -3), "high": -7}},
    "CAD": {"positive": {"low": (0, 2), "medium": (2, 5), "high": 5},
            "negative": {"low": (-2, 0), "medium": (-5, -2), "high": -5}},
    "CHF": {"positive": {"low": (0, 2), "medium": (2, 5), "high": 5},
            "negative": {"low": (-2, 0), "medium": (-5, -2), "high": -5}},
    "EUR": {"positive": {"low": (0, 2), "medium": (2, 5), "high": 5},
            "negative": {"low": (-2, 0), "medium": (-5, -2), "high": -5}},
    "GBP": {"positive": {"low": (0, 2), "medium": (2, 5), "high": 5},
            "negative": {"low": (-2, 0), "medium": (-5, -2), "high": -5}},
    "JPY": {"positive": {"low": (0, 2), "medium": (2, 5), "high": 5},
            "negative": {"low": (-2, 0), "medium": (-5, -2), "high": -5}},
    "NZD": {"positive": {"low": (0, 2), "medium": (2, 5), "high": 5},
            "negative": {"low": (-2, 0), "medium": (-5, -2), "high": -5}},
    "USD": {"positive": {"low": (0, 2), "medium": (2, 5), "high": 5},
            "negative": {"low": (-2, 0), "medium": (-5, -2), "high": -5}}
}

def classify_delta_tot_percent(currency_symbol, delta_percent):
    """
    Classifica il Delta TOT in termini percentuali
    Vantaggi:
    1. Valori normalizzati e confrontabili tra valute
    2. Scala intuitiva da -10 a +10
    3. Classificazione con emoji per facile lettura
    """
    ranges = CURRENCY_RANGES_PERCENT[currency_symbol]
    
    if delta_percent > 0:
        if delta_percent <= ranges["positive"]["low"][1]:
            return "🟡 BASSO POSITIVO"
        elif delta_percent <= ranges["positive"]["medium"][1]:
            return "🟨 MEDIO POSITIVO"
        else:
            return "⭐ ALTO POSITIVO"
    else:
        if delta_percent >= ranges["negative"]["low"][0]:
            return "🔵 BASSO NEGATIVO"
        elif delta_percent >= ranges["negative"]["medium"][0]:
            return "🔴 MEDIO NEGATIVO"
        else:
            return "❌ ALTO NEGATIVO"

def get_currency_data(currency_name):
    """
    Recupera e analizza i dati COT per una singola valuta
    Process:
    1. Lettura dati grezzi dal CSV
    2. Calcolo delta semplice e ponderato
    3. Normalizzazione e classificazione
    4. Combinazione classificazioni storica e moderna
    """
    data = pd.read_csv(output_csv, header=None)
    columns = {"name": 0, "long_positions": 8, "short_positions": 9, "long_change": 38, "short_change": 39}
    currency_data = data[data[columns["name"]] == currency_name]

    if currency_data.empty:
        print(f"Valuta '{currency_name}' non trovata nel file.")
        return None

    result = {
        "name": currency_name,
        "long_positions": int(currency_data.iloc[0, columns["long_positions"]]),
        "short_positions": int(currency_data.iloc[0, columns["short_positions"]]),
        "long_change": int(currency_data.iloc[0, columns["long_change"]]),
        "short_change": int(currency_data.iloc[0, columns["short_change"]])
    }
    
    currency_symbol = currency_mapping.get(currency_name, "").split()[0]
    notional = CONTRACT_NOTIONAL[currency_symbol]
    max_delta = MAX_HISTORICAL_DELTAS[currency_symbol]
    
    # Calcola prima il delta semplice (per range storico)
    simple_delta = result["long_change"] - result["short_change"]
    
    # Prendi la classificazione storica basata sul delta semplice
    historical_classification = classify_delta_tot(currency_symbol, simple_delta)

    # Calcola i valori ponderati
    weighted_long_change = result["long_change"] * notional
    weighted_short_change = result["short_change"] * notional
    raw_delta = weighted_long_change - weighted_short_change

    # Normalizza il delta nella scala da -10 a +10
    result["delta_tot"] = (raw_delta / max_delta) * 10

    # Memorizza tutti i valori
    result["raw_delta"] = raw_delta
    result["notional_value"] = notional
    result["simple_delta"] = simple_delta

    # Calcola la percentuale per la classificazione moderna
    total_positions = result["long_positions"] + result["short_positions"]
    result["delta_percent"] = (result["delta_tot"] / 10) * 100
    
    # Prendi entrambe le classificazioni
    result["historical_classification"] = historical_classification
    result["modern_classification"] = classify_delta_tot_percent(currency_symbol, result["delta_percent"])

    # Combina classificazioni (usa quella piú conservativa)
    historical_score = classification_scores.get(historical_classification, 0)
    modern_score = classification_scores.get(result["modern_classification"], 0)

    # Usa la classificazione con il punteggio assoluto piú basso
    if abs(historical_score) <= abs(modern_score):
        result["classification"] = historical_classification
    else:
        result["classification"] = result["modern_classification"]
    
    return result

def valuta_segnale(data):
    """
    Interpreta la direzione del cambio nelle posizioni
    Restituisce:
    - LONG se aumentano long e diminuiscono short
    - SHORT se aumentano short e diminuiscono long
    - NEUTRALE negli altri casi
    """
    if data is None:
        return "DATI NON DISPONIBILI"
    if data["long_change"] < 0 and data["short_change"] > 0:
        return f"SHORT (tolte {abs(data['long_change'])} long, aggiunte {data['short_change']} short)"
    elif data["long_change"] > 0 and data["short_change"] < 0:
        return f"LONG (aggiunte {data['long_change']} long, tolte {abs(data['short_change'])} short)"
    else:
        return f"NEUTRALE (long_change={data['long_change']}, short_change={data['short_change']})"

# Mappatura punteggi per le classificazioni
# Usata per confrontare e combinare le classificazioni
classification_scores = {
    "⭐ ALTO POSITIVO": 3,     # Massima forza rialzista
    "🟨 MEDIO POSITIVO": 2,    # Media forza rialzista
    "🟡 BASSO POSITIVO": 1,    # Debole forza rialzista
    "🔵 BASSO NEGATIVO": -1,   # Debole forza ribassista
    "🔴 MEDIO NEGATIVO": -2,   # Media forza ribassista
    "❌ ALTO NEGATIVO": -3     # Massima forza ribassista
}

def interpret_pair_score(score):
    """
    Interpreta il punteggio combinato di una coppia valutaria
    Converte i punteggi numerici in valutazioni qualitative
    Usa emoji per una rapida interpretazione visiva
    """
    if score >= 5:
        return "📈 MOLTO FORTE (LONG)"
    elif score >= 3:
        return "👍 FORTE (LONG)"
    elif score >= 1:
        return "🟢 MODERATAMENTE FORTE"
    elif score == 0:
        return "⚖️ NEUTRO"
    elif score >= -2:
        return "🔻 MODERATAMENTE DEBOLE"
    elif score >= -4:
        return "👎 DEBOLE (SHORT)"
    else:
        return "📉 MOLTO DEBOLE (SHORT)"

def analyze_major_pairs(currencies_data):
    """
    Analizza le coppie forex principali
    Process:
    1. Estrae classificazioni per base e quote
    2. Calcola il punteggio relativo
    3. Determina la forza del segnale
    4. Ordina per potenziale di trading
    """
    analyzed_pairs = []
    for pair in MAJOR_PAIRS:
        if "JPY" in pair:
            base, quote = ("USD", "JPY") if pair == "USDJPY" else (None, None)
        else:
            base = pair[:3]
            quote = pair[3:]

        base_full = next((k for k, v in currency_mapping.items() if v == base), None)
        quote_full = next((k for k, v in currency_mapping.items() if v == quote), None)

        if base_full and quote_full:
            base_data = currencies_data.get(base_full)
            quote_data = currencies_data.get(quote_full)

            if base_data and quote_data:
                base_score = classification_scores.get(base_data['classification'], 0)
                quote_score = classification_scores.get(quote_data['classification'], 0)
                pair_score = base_score - quote_score
                pair_strength = interpret_pair_score(pair_score)

                analyzed_pairs.append({
                    'pair': pair,
                    'base_currency': base,
                    'quote_currency': quote,
                    'base_classification': base_data['classification'],
                    'quote_classification': quote_data['classification'],
                    'score': pair_score,
                    'strength': pair_strength
                })

    return analyzed_pairs

# Lista valute
currencies = list(currency_mapping.keys())

# Esecuzione
download_and_convert()

# Recupera i dati
currencies_data = {currency: get_currency_data(currency) for currency in currencies}

# Stampa risultati individuali
print("\nRisultati delle valute:")
print("=" * 50)
for currency in currencies:
    data = currencies_data[currency]
    if data:
        segnale = valuta_segnale(data)
        print(f"Nome: {data['name']}")
        print(f"  - Posizioni long totali: {data['long_positions']}")
        print(f"  - Posizioni short totali: {data['short_positions']}")
        print(f"  - Cambio di posizioni long: {data['long_change']}")
        print(f"  - Cambio di posizioni short: {data['short_change']}")
        print(f"  - Delta TOT: {data['simple_delta']:+}")
        print(f"  - Delta TOT ponderato: {data['raw_delta']:,.2f}")
        print(f"  - Delta TOT normalizzato: {data['delta_tot']:.2f}")
        print(f"  - Class. Storica: {data['historical_classification']}")
        print(f"  - Class. Moderna: {data['modern_classification']} ({data['delta_percent']:.1f}%)")
        print(f"  - Class. Finale: {data['classification']}")
        print("-" * 50)

# Analisi coppie
trading_opportunities = sorted(analyze_major_pairs(currencies_data), key=lambda x: x['score'], reverse=True)

print("\nAnalisi Major Pairs (ordinate per forza):")
print("=" * 80)
for analysis in trading_opportunities:
    print(f"\nCoppia: {analysis['pair']}")
    print(f"  {analysis['base_currency']} → {analysis['base_classification']}")
    print(f"  {analysis['quote_currency']} → {analysis['quote_classification']}")
    print(f"  Punteggio: {analysis['score']}")
    print(f"  Valutazione: {analysis['strength']}")
    print("-" * 80)

def trova_cartella_metatrader():
    """
    Cerca la cartella di installazione di MetaTrader
    Ricerca ricorsiva nella directory AppData
    Restituisce il percorso completo o None se non trovato
    """
    utente = getpass.getuser()
    base_path = f"C:/Users/{utente}/AppData/Roaming/MetaQuotes/Terminal/"
    if not os.path.exists(base_path):
        return None

    for root, dirs, files in os.walk(base_path):
        for d in dirs:
            if d == "Files":
                full_path = os.path.join(root, d)
                return full_path
    return None

# Generate and save signals
pair_signal_file_local = "pair_signals.csv"
metatrader_path = r"C:\Users\user\AppData\Roaming\MetaQuotes\Terminal\Common\Files\pair_signals.csv"

# Function to write the signals to a CSV file
def write_signals_to_csv(filepath, signals):
    """
    Salva i segnali di trading in formato CSV
    Input:
    - filepath: percorso del file di output
    - signals: lista di segnali con coppia, direzione e punteggio
    Output:
    - File CSV con intestazioni e segnali formattati
    """
    with open(filepath, "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Pair", "Signal", "Score"])
        for pair in signals:
            if pair["score"] > 0:
                signal = "BUY"
            elif pair["score"] < 0:
                signal = "SELL"
            else:
                signal = "NEUTRAL"
            writer.writerow([pair["pair"], signal, pair["score"]])

# Save in current directory
write_signals_to_csv(pair_signal_file_local, trading_opportunities)
print(f"\n✅ File '{pair_signal_file_local}' generato nella cartella corrente.")

# Save in MetaTrader directory (Common)
try:
    write_signals_to_csv(metatrader_path, trading_opportunities)
    print(f"✅ File salvato nella cartella comune di MetaTrader:\n{metatrader_path}")
except Exception as e:
    print(f"⚠️ Errore nel salvare il file in MetaTrader: {str(e)}")
    print("Verifica che la cartella esista e che tu abbia i permessi di scrittura")
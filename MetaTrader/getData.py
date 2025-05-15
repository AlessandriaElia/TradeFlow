import requests
import csv
import os
import pandas as pd

url = "https://www.cftc.gov/dea/newcot/deafut.txt"

output_txt = "COT_Report.txt"
output_csv = "COT_Report.csv"
metatrader_file = r"C:\Users\user\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075\MQL5\Files\COT_Results.csv"

def download_and_convert():
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

    print(f"File CSV creato con successo: {output_csv}")

    os.remove(output_txt)
    print("Pulizia completata.")

def get_currency_data(currency_name):
    data = pd.read_csv(output_csv, header=None)
    
    columns = {
        "name": 0,  
        "long_positions": 8,  
        "short_positions": 9,  
        "long_change": 38,  
        "short_change": 39 
    }
    
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
    
    return result

def valuta_segnale(data):
    """
    Restituisce un segnale operativo:
    - LONG se vengono tolte più posizioni short che long (short_change < long_change)
    - SHORT se vengono tolte più posizioni long che short (long_change < short_change)
    """
    if data is None:
        return "DATI NON DISPONIBILI"
    if abs(data["short_change"]) > abs(data["long_change"]):
        return f"LONG (tolte più short: {data['short_change']} vs {data['long_change']})"
    elif abs(data["long_change"]) > abs(data["short_change"]):
        return f"SHORT (tolte più long: {data['long_change']} vs {data['short_change']})"
    else:
        return f"LONG/SHORT PARI (long_change={data['long_change']}, short_change={data['short_change']})"

currencies = [
    "AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE",
    "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE",
    "CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE",
    "EURO FX - CHICAGO MERCANTILE EXCHANGE",
    "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE",
    "SWISS FRANC - CHICAGO MERCANTILE EXCHANGE",
    "USD INDEX - ICE FUTURES U.S.",
    "NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE"
]

download_and_convert()

# Commentata la parte che salva il CSV nella cartella di MetaTrader
# with open(metatrader_file, "w", newline="") as file:
#     writer = csv.writer(file)
#     writer.writerow(["Name", "Long Positions", "Short Positions", "Long Change", "Short Change"])  # Header del file
#     for currency in currencies:
#         data = get_currency_data(currency)
#         if data:
#             writer.writerow([
#                 data["name"],
#                 data["long_positions"],
#                 data["short_positions"],
#                 data["long_change"],
#                 data["short_change"]
#             ])

# Stampa i risultati in maniera leggibile nel terminale
print("\nRisultati delle valute:")
print("=" * 50)
for currency in currencies:
    data = get_currency_data(currency)
    if data:
        segnale = valuta_segnale(data)
        print(f"Nome: {data['name']}")
        print(f"  - Posizioni long totali: {data['long_positions']}")
        print(f"  - Posizioni short totali: {data['short_positions']}")
        print(f"  - Cambio di posizioni long: {data['long_change']}")
        print(f"  - Cambio di posizioni short: {data['short_change']}")
        print(f"  - Segnale: {segnale}")
        print("-" * 50)

print("\nElaborazione completata.")
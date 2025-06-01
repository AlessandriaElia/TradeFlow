import numpy as np

def analyze_delta_tot():
    # I dati sono direttamente inseriti qui come stringa multi-riga
    delta_tot_str = """
   493
-659
525
-2.802
-1.085
-4.128
-427
280
-9.647
2.097
-994
-1.036
1.472
757
339
-672
2.143
4.084
1.768
385
851
8.865
-170
-255
-86
-401
-2.407
-1.589
773
3.011
-211
-2.043
-805
-839
-18.412
781
516
1.322
-945
2.400
-822
-1.262
-330
2.342
-374
-940
-73
12.582
126
713
656
1.078
587
1.888
178
716
213
754
-1.267
-1.308
-5.507
3.087
1.016
537
-456
466
1.164
-1.275
347
-1.610
487
-714
-805
13.659
-2.343
857
-1.610
963
263
486
-686
503
-310
662
2.057
1.124
9.563
2.712
    """
    
    # Pulisci e dividi la stringa in righe
    lines = delta_tot_str.strip().split('\n')
    values = []
    
    # Elabora ogni riga cercando numeri
    for line in lines:
        try:
            # Rimuove eventuali spazi extra e punti decimali, poi converte in intero
            line_cleaned = line.strip().replace('.', '')
            value = int(line_cleaned)
            values.append(value)
        except ValueError:
            # Se non è un numero valido, ignora
            continue
    
    # Separa i valori positivi e negativi
    positivi = [x for x in values if x > 0]
    negativi = [x for x in values if x < 0]
    
    # Trova il massimo e il minimo
    max_value = max(values)
    min_value = min(values)
    
    # Stampa il massimo e il minimo
    print(f"Massimo valore trovato: {format_number(max_value)}")
    print(f"Minimo valore trovato: {format_number(min_value)}")
    print("")
    
    # Gestione valori positivi
    if not positivi:
        print("Attenzione: Non ci sono valori positivi nei dati.")
        pos_low = 0
        pos_med = 0
    else:
        pos_low = np.percentile(positivi, 33)
        pos_med = np.percentile(positivi, 66)
    
    # Gestione valori negativi
    if not negativi:
        print("Attenzione: Non ci sono valori negativi nei dati.")
        neg_high = 0
        neg_med = 0
    else:
        neg_high = np.percentile(negativi, 33)
        neg_med = np.percentile(negativi, 66)
    
    # Formatta i numeri con punto decimale come nell'esempio
    pos_low_fmt = format_number(pos_low)
    pos_med_fmt = format_number(pos_med)
    neg_high_fmt = format_number(neg_high)
    neg_med_fmt = format_number(neg_med)
    
    # Stampa i risultati nel formato richiesto
    print("🔼 Delta Totale Positivo:")
    print(f"Basso: da 0 a {pos_low_fmt}")
    print("")
    print(f"Medio: da {pos_low_fmt} a {pos_med_fmt}")
    print("")
    print(f"Alto: oltre {pos_med_fmt}")
    print("")
    print("🔽 Delta Totale Negativo:")
    print(f"Alto (grande calo): sotto {neg_high_fmt}")
    print("")
    print(f"Medio: da {neg_high_fmt} a {neg_med_fmt}")
    print("")
    print(f"Basso (leggero calo): da {neg_med_fmt} a -1")
    
    return {
        "positivi": {
            "basso": (0, pos_low),
            "medio": (pos_low, pos_med),
            "alto": (pos_med, float('inf'))
        },
        "negativi": {
            "alto": (float('-inf'), neg_high),
            "medio": (neg_high, neg_med),
            "basso": (neg_med, -1)
        }
    }

def format_number(num):
    """Formatta il numero come richiesto con punto decimale"""
    # Converte in numero con 3 decimali e rimuove zeri finali non necessari
    formatted = f"{num:.3f}".rstrip('0').rstrip('.')
    return formatted

if __name__ == "__main__":
    # Esegui l'analisi direttamente con i dati inseriti nella funzione
    analyze_delta_tot()
'use strict';
const _URL = ''; // Base URL per le richieste (può essere lasciato vuoto per richieste locali)

/**
 * inviaRichiesta
 * Funzione generica per inviare richieste HTTP (GET, POST, PUT, DELETE, ecc.)
 * Gestisce sia JSON che FormData, e restituisce un oggetto con status e dati o errore.
 * @param {string} method Il metodo della richiesta (es: "GET", "POST")
 * @param {string} url L'endpoint della richiesta
 * @param {JSON|FormData} params Parametri opzionali da inviare (JSON o FormData)
 * @returns {Promise<{status:number, data?:any, err?:string}>}
 */
async function inviaRichiesta(method, url = '', params = {}) {
  console.log("URL della richiesta:", url);

  method = method.toUpperCase();
  let options = {
    method: method,
    headers: {},
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  };

  // Gestione parametri per richieste GET
  if (method == 'GET') {
    const queryParams = new URLSearchParams();
    for (let key in params) {
      let value = params[key];
      // Se il valore è un oggetto, lo serializza in JSON
      if (value && typeof value === 'object') queryParams.append(key, JSON.stringify(value));
      else queryParams.append(key, value);
    }
    if (queryParams.toString()) {
      url += '?' + queryParams.toString();
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    // Gestione parametri per POST/PUT/DELETE
    if (params instanceof FormData) {
      // Se params è FormData, non impostare il Content-Type (lo fa il browser)
      options['body'] = params; // Accetta FormData, File, Blob
    } else {
      // Altrimenti invia come JSON
      options['body'] = JSON.stringify(params);
      options.headers['Content-Type'] = 'application/json';
    }
  }

  try {
    // Esegue la richiesta HTTP
    const response = await fetch(_URL + url, options);
    if (!response.ok) {
      // Se la risposta non è ok, restituisce lo status e il testo dell'errore
      let err = await response.text();
      return { status: response.status, err };
    } else {
      // Prova a fare il parsing della risposta come JSON
      let data = await response.json().catch(function (err) {
        console.log(err);
        return { status: 422, err: 'Response contains an invalid json' };
      });
      return { status: 200, data };
    }
  } catch {
    // Gestione errori di rete o timeout
    return { status: 408, err: 'Connection Refused or Server timeout' };
  }
}

/**
 * base64Convert
 * Converte un Blob/File in una stringa base64 (utile per upload immagini)
 * @param {Blob} blob Il file o blob da convertire
 * @returns {Promise<string>} La stringa base64 risultante
 */
function base64Convert(blob) {
  return new Promise(function (resolve, reject) {
    let reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = function (event) {
      resolve(event.target.result);
    };
    reader.onerror = function (error) {
      reject(error);
    };
  });
}

// --- Carrello per utente ---

/**
 * getUserCartKey
 * Restituisce la chiave del carrello per l'utente loggato (basata sull'email)
 * @returns {string|null} La chiave del carrello o null se non loggato
 */
function getUserCartKey() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return `cart_${payload.email}`;
  } catch {
    return null;
  }
}

/**
 * getUserCart
 * Restituisce il carrello dell'utente corrente dal localStorage
 * @returns {Array} Array degli oggetti nel carrello
 */
function getUserCart() {
  const cartKey = getUserCartKey();
  if (!cartKey) return [];
  return JSON.parse(localStorage.getItem(cartKey)) || [];
}

/**
 * setUserCart
 * Salva il carrello dell'utente corrente nel localStorage
 * @param {Array} cart Array degli oggetti da salvare nel carrello
 */
function setUserCart(cart) {
  const cartKey = getUserCartKey();
  if (!cartKey) return;
  localStorage.setItem(cartKey, JSON.stringify(cart));
}
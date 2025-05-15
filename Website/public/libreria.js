'use strict';
const _URL = '';

/**
 * @param {string} method The method of the request
 * @param {string} url The resource of the request
 * @param {JSON} params Optional params in JSON format
 * @returns
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

  if (method == 'GET') {
    const queryParams = new URLSearchParams();
    for (let key in params) {
      let value = params[key];
      if (value && typeof value === 'object') queryParams.append(key, JSON.stringify(value));
      else queryParams.append(key, value);
    }
    if (queryParams.toString()) {
      url += '?' + queryParams.toString();
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    if (params instanceof FormData) {
      // In caso di formData occorre OMETTERE il Content-Type!
      // options.headers["Content-Type"]="multipart/form-data;"
      options['body'] = params; // Accept FormData, File, Blob
    } else {
      options['body'] = JSON.stringify(params);
      options.headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const response = await fetch(_URL + url, options);
    if (!response.ok) {
      let err = await response.text();
      return { status: response.status, err };
    } else {
      let data = await response.json().catch(function (err) {
        console.log(err);
        return { status: 422, err: 'Response contains an invalid json' };
      });
      return { status: 200, data };
    }
  } catch {
    return { status: 408, err: 'Connection Refused or Server timeout' };
  }
}

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

function getUserCart() {
  const cartKey = getUserCartKey();
  if (!cartKey) return [];
  return JSON.parse(localStorage.getItem(cartKey)) || [];
}

function setUserCart(cart) {
  const cartKey = getUserCartKey();
  if (!cartKey) return;
  localStorage.setItem(cartKey, JSON.stringify(cart));
}
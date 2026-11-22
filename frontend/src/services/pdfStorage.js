const DATABASE_NAME = 'atlas-system-browser-files';
const STORE_NAME = 'pdfs';
const DATABASE_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador no admite almacenamiento local de archivos.'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento de PDF del navegador.'));
    request.onblocked = () => reject(new Error('Cierra otras pestañas de Atlas para actualizar el almacenamiento local.'));
  });
}

function runTransaction(mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error('No se pudo completar la operación de almacenamiento local del PDF.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error('Se canceló la operación de almacenamiento local del PDF.'));
    };

    try {
      result = operation(store);
    } catch (error) {
      transaction.abort();
      database.close();
      reject(error);
    }
  }));
}

export async function storePdf(file) {
  const id = `atlas-browser:${window.crypto.randomUUID()}`;
  await runTransaction('readwrite', (store) => {
    store.put({
      id,
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      blob: file,
      savedAt: new Date().toISOString(),
    });
  });
  return id;
}

export async function readPdf(id) {
  const record = await runTransaction('readonly', (store) => store.get(id));
  return record.result || null;
}

export async function removePdf(id) {
  return runTransaction('readwrite', (store) => store.delete(id));
}

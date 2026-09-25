// Имя базы и хранилища вынесены в константы, чтобы Upload и Configurator
// гарантированно читали один и тот же временный файл гостя.
const DATABASE_NAME = 'project-drive-local';
const STORE_NAME = 'pending-assets';
const PHOTO_KEY = 'car-photo';
const WHEEL_REFERENCE_KEY = 'wheel-reference';

// IndexedDB — встроенное хранилище браузера. В отличие от localStorage оно умеет
// безопасно хранить сам файл изображения, а не только короткий текст.
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingPhoto(file) {
  const database = await openDatabase();

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(
      {
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        savedAt: new Date().toISOString(),
      },
      PHOTO_KEY,
    );
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

export async function getPendingPhoto() {
  const database = await openDatabase();
  const value = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(PHOTO_KEY);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value;
}

export async function clearPendingPhoto() {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(PHOTO_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function savePendingWheelReference(file) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      file, name: file.name, type: file.type, size: file.size, savedAt: new Date().toISOString(),
    }, WHEEL_REFERENCE_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getPendingWheelReference() {
  const database = await openDatabase();
  const value = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(WHEEL_REFERENCE_KEY);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value;
}

export async function clearPendingWheelReference() {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(WHEEL_REFERENCE_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

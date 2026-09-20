import { clearToken, getToken } from './storage.js';

// Единая обёртка над fetch: добавляет локальный токен, кодирует JSON и всегда
// превращает ошибочный ответ API в понятный Error для интерфейса.
export async function apiRequest(path, {
  method = 'GET', token = getToken(), body, headers = {},
} = {}) {
  const isBinary = typeof Blob !== 'undefined' && body instanceof Blob;
  const isRaw = isBinary || typeof body === 'string' || body instanceof ArrayBuffer;
  const requestHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body != null && !isRaw ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  };

  const response = await fetch(path, {
    method,
    headers: requestHeaders,
    body: body == null ? undefined : isRaw ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // 401 означает, что сервер больше не признаёт локальный пропуск. Очищаем
    // его централизованно, чтобы все страницы одинаково предлагали войти снова.
    // 402 (не хватает кредитов) и другие ошибки сессию не затрагивают.
    if (response.status === 401) clearToken();
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

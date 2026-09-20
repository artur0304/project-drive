// Все ключи браузерного хранилища собраны здесь. Остальные страницы вызывают
// функции этого модуля и не зависят от точного написания строковых ключей.
const KEYS = Object.freeze({
  token: 'project-drive-token',
  draft: 'project-drive-draft',
  projectId: 'project-drive-project-id',
  uploadedProjectId: 'project-drive-uploaded-project-id',
  legacyLastResult: 'project-drive-last-result',
});

function session() {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

function local() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function getToken() { return session()?.getItem(KEYS.token) || ''; }
export function setToken(token) { session()?.setItem(KEYS.token, token); }
export function clearToken() { session()?.removeItem(KEYS.token); }

export function getProjectId() { return session()?.getItem(KEYS.projectId) || ''; }
export function setProjectId(id) { session()?.setItem(KEYS.projectId, id); }
export function clearProjectId() { session()?.removeItem(KEYS.projectId); }

export function getUploadedProjectId() { return session()?.getItem(KEYS.uploadedProjectId) || ''; }
export function setUploadedProjectId(id) { session()?.setItem(KEYS.uploadedProjectId, id); }
export function clearUploadedProjectId() { session()?.removeItem(KEYS.uploadedProjectId); }

export function getDraft() {
  const raw = local()?.getItem(KEYS.draft);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setDraft(draft) { local()?.setItem(KEYS.draft, JSON.stringify(draft)); }
export function clearDraft() { local()?.removeItem(KEYS.draft); }

// Старые версии интерфейса сохраняли результат целиком в sessionStorage.
// Теперь результат читается по id с сервера; удаляем только устаревший ключ.
export function clearLegacyLastResult() { session()?.removeItem(KEYS.legacyLastResult); }

export function clearActiveProject({ includeDraft = false } = {}) {
  clearProjectId();
  clearUploadedProjectId();
  clearLegacyLastResult();
  if (includeDraft) clearDraft();
}

export function clearSession() {
  clearToken();
  clearActiveProject();
}

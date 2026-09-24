// Единая граница для файлов изображений. Сейчас это локальные папки; будущий
// адаптер R2/S3 реализует те же методы, не меняя маршруты и AI-провайдер.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { basename, join } from 'node:path';

const writableScopes = new Set(['uploads', 'wheel-uploads']);
const urlPattern = /^\/(uploads|wheel-uploads|wheel-catalog)\/([a-z0-9._-]+)$/i;

export function createLocalObjectStorage({ backendRoot, wheelCatalogRoot }) {
  const roots = { uploads: join(backendRoot, 'uploads'), 'wheel-uploads': join(backendRoot, 'wheel-uploads'), 'wheel-catalog': wheelCatalogRoot };
  function parseUrl(url) {
    const match = String(url || '').match(urlPattern);
    if (!match) throw new Error('object_url_invalid');
    const scope = match[1].toLowerCase();
    const name = basename(match[2]);
    return { scope, name, path: join(roots[scope], name) };
  }
  return {
    async ensureReady() { await Promise.all([...writableScopes].map((scope) => mkdir(roots[scope], { recursive: true }))); },
    async put({ scope, name, bytes }) {
      if (!writableScopes.has(scope)) throw new Error('object_scope_read_only');
      if (basename(name) !== name || !/^[a-z0-9._-]+$/i.test(name)) throw new Error('object_name_invalid');
      await mkdir(roots[scope], { recursive: true });
      await writeFile(join(roots[scope], name), bytes);
      return `/${scope}/${name}`;
    },
    async get(url) { return readFile(parseUrl(url).path); },
    async exists(url) { try { await access(parseUrl(url).path); return true; } catch { return false; } },
  };
}

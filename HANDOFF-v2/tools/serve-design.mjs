// Локальный сервер только для просмотра HTML-прототипов в браузере.
// Он не публикует файлы в интернет и слушает только этот компьютер.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const designRoot = join(import.meta.dirname, '..', 'design');
const port = 4173;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

createServer(async (request, response) => {
  // Если путь пустой, сразу показываем общий экран со всеми прототипами.
  const requestedPath = request.url === '/'
    ? '00-all-screens-preview.html'
    : decodeURIComponent(request.url.slice(1).split('?')[0]);

  // normalize убирает лишние точки и разделители. Дополнительная проверка не даёт
  // запросить через этот сервер файл за пределами папки design.
  const safePath = normalize(requestedPath);
  if (safePath.startsWith('..')) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const filePath = join(designRoot, safePath);
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Project Drive design: http://127.0.0.1:${port}`);
});

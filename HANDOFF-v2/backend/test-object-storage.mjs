import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLocalObjectStorage } from './object-storage.mjs';

const root = await mkdtemp(join(tmpdir(), 'project-drive-storage-'));
try {
  const catalog = join(root, 'catalog');
  await mkdir(catalog);
  await writeFile(join(catalog, 'reference.png'), Buffer.from('reference'));
  const storage = createLocalObjectStorage({ backendRoot: root, wheelCatalogRoot: catalog });
  await storage.ensureReady();
  const url = await storage.put({ scope: 'uploads', name: 'photo.jpg', bytes: Buffer.from('photo') });
  assert.equal(url, '/uploads/photo.jpg');
  assert.equal(String(await storage.get(url)), 'photo');
  assert.equal(await storage.exists('/uploads/missing.jpg'), false);
  assert.equal(String(await storage.get('/wheel-catalog/reference.png')), 'reference');
  await assert.rejects(storage.put({ scope: 'uploads', name: '../secret.jpg', bytes: Buffer.from('x') }), /object_name_invalid/);
  await assert.rejects(storage.put({ scope: 'wheel-catalog', name: 'overwrite.png', bytes: Buffer.from('x') }), /object_scope_read_only/);
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log('✅ Локальный object-storage сохраняет и читает файлы, каталог read-only, traversal закрыт.');

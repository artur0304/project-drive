import assert from 'node:assert/strict';
import { createErrorLog, createRequestContext, writeErrorLog } from './observability.mjs';

const context = createRequestContext({ method: 'POST', path: '/api/generate' });
const entry = createErrorLog(context, Object.assign(new Error('secret body'), { password: 'hunter2' }), 500);
assert.match(entry.requestId, /^[0-9a-f-]{36}$/);
assert.equal(entry.method, 'POST');
assert.equal(entry.path, '/api/generate');
assert.equal(Object.hasOwn(entry, 'message'), false);
assert.equal(JSON.stringify(entry).includes('secret body'), false);
assert.equal(JSON.stringify(entry).includes('hunter2'), false);

let line = '';
writeErrorLog(context, new Error('do not log me'), 500, (value) => { line = value; });
assert.doesNotThrow(() => JSON.parse(line));
console.log('✅ Структурный error-log содержит request id и не записывает тело, пароль или текст ошибки.');

import { randomUUID } from 'node:crypto';

export function createRequestContext({ method, path }) {
  return {
    requestId: randomUUID(),
    method: String(method || 'UNKNOWN').slice(0, 12),
    path: String(path || '/').slice(0, 240),
    startedAt: Date.now(),
  };
}

export function createErrorLog(context, error, status = 500) {
  return {
    timestamp: new Date().toISOString(),
    level: 'error',
    event: 'request_failed',
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    status,
    durationMs: Math.max(0, Date.now() - context.startedAt),
    errorName: String(error?.name || 'Error').slice(0, 80),
  };
}

export function writeErrorLog(context, error, status = 500, sink = console.error) {
  const entry = createErrorLog(context, error, status);
  sink(JSON.stringify(entry));
  return entry;
}

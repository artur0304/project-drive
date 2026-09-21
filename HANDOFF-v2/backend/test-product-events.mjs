process.env.PROJECT_DRIVE_DB_PATH = ':memory:';

import assert from 'node:assert/strict';
const db = await import('./db.mjs');

const user = db.createUser({ email: 'analytics@example.com' });
const project = db.createProject({ userId: user.id, name: 'Analytics car' });
db.recordProductEvent({ userId: user.id, projectId: project.id, eventName: 'project_created' });
db.recordProductEvent({ userId: user.id, projectId: project.id, eventName: 'photo_uploaded', details: { width: 1280 } });
db.recordProductEvent({ userId: user.id, projectId: project.id, eventName: 'mock_generation_succeeded', details: { creditsCharged: 25 } });
db.recordProductEvent({ userId: user.id, projectId: project.id, eventName: 'mock_generation_succeeded', details: { creditsCharged: 10 } });

const analytics = db.getProductAnalytics({ days: 30, recentLimit: 2 });
assert.equal(analytics.recent.length, 2);
assert.equal(analytics.totals.find((row) => row.event_name === 'mock_generation_succeeded').count, 2);
assert.equal(analytics.totals.find((row) => row.event_name === 'photo_uploaded').count, 1);
assert.equal(Object.hasOwn(analytics.recent[0], 'user_id'), false, 'админская сводка не должна отдавать email или user id');
assert.deepEqual(analytics.funnel, {
  created: 1, uploaded: 1, generated: 1, succeeded: 1, reported: 0,
  uploadRate: 100, generationRate: 100, successRate: 100, reportRate: 0,
});
console.log('✅ Локальные продуктовые события агрегируются без внешней аналитики и персональных данных в сводке.');

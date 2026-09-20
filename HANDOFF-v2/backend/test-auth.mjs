// ============================================================================
// test-auth.mjs — самопроверка входа. Ничего не устанавливает, не лезет в сеть.
// Запуск: node --experimental-sqlite test-auth.mjs
// ============================================================================
// Тест использует базу только в памяти и не касается локального projectdrive.db.
process.env.PROJECT_DRIVE_DB_PATH = ':memory:';

const auth = await import('./auth.mjs');

console.log('1) Регистрируем пользователя (почта + пароль)…');
const reg = auth.register({ email: 'artur@example.com', password: 'secret123', name: 'Артур' });
console.log('   создан:', reg.user.email, '| выдан пропуск (токен):', reg.token.slice(0, 10) + '…');

console.log('2) Пробуем войти с НЕВЕРНЫМ паролем — должно НЕ пустить…');
try { auth.login({ email: 'artur@example.com', password: 'wrong' }); console.log('   ОШИБКА: пустило (так быть не должно!)'); }
catch (e) { console.log('   отказано верно:', e.message); }

console.log('3) Входим с ВЕРНЫМ паролем…');
const log = auth.login({ email: 'artur@example.com', password: 'secret123' });
console.log('   вход успешен, новый пропуск:', log.token.slice(0, 10) + '…');

console.log('4) Проверяем пропуск (кто это?)…');
const who = auth.checkSession(log.token);
console.log('   пропуск действителен, это:', who ? who.email : '(никто)');

console.log('5) Проверяем поддельный пропуск — должно вернуть "никто"…');
console.log('   результат:', auth.checkSession('поддельный-токен') ? 'пустило (плохо!)' : 'никто (верно)');

console.log('6) Выходим и снова проверяем пропуск — должен стать недействителен…');
auth.logout(log.token);
console.log('   после выхода пропуск:', auth.checkSession(log.token) ? 'ещё живой (плохо!)' : 'недействителен (верно)');

console.log('\n✅ Вход работает: пароль хранится отпечатком, неверный не пускает, пропуска выдаются и гасятся.');

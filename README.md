# Project Drive

Project Drive — рабочий прототип сервиса, который позволяет загрузить фотографию
автомобиля и подготовить изменения плёнки, тонировки и дисков.

## Где находится приложение

Актуальный код не лежит прямо в корне репозитория. Основная рабочая папка:

```text
HANDOFF-v2/
├── web/                 Next.js 16 + React 19
│   ├── app/             страницы приложения
│   ├── package.json
│   └── next.config.mjs
├── backend/             локальный Node.js API + SQLite
│   ├── server.mjs
│   ├── db.mjs
│   └── package.json
├── ai-core-slice0/      провайдеры, оркестратор и bake-off
├── design/              исходные HTML-прототипы
└── docs/                бриф, решения и документация
```

Папка `HANDOFF-v2/web/app/` содержит реальные React-страницы: Landing, Upload,
Configurator, Result, Garage, Credits, Account и Login. Это уже не архив и не
только статичный дизайн.

## Что уже работает

- регистрация и вход через локальный API;
- создание проектов и загрузка фотографий;
- конфигуратор и безопасная mock-генерация;
- сохранение версий в SQLite и Garage;
- локальный баланс и журнал операций;
- жалобы на неудачный результат;
- JPEG-нормализация загрузок с удалением EXIF/GPS;
- production-сборка Next.js.
- постоянные ссылки результата `/result/<versionId>` с загрузкой из API;
- единый серверный прайс и изолированные тесты денежной цепочки.

Реальные платные AI-вызовы отключены. Правило и полный статус проекта описаны в
[`HANDOFF-v2/00_READ_ME_FIRST.md`](HANDOFF-v2/00_READ_ME_FIRST.md).

## Запуск

Установить зависимости:

```bash
npm run install:all
```

Backend, порт `3000`:

```bash
npm run dev:backend
```

Frontend, порт `3001`:

```bash
npm run dev:web
```

Production-проверка frontend:

```bash
npm run build:web
```

Все локальные тесты:

```bash
npm test
```

Локальные базы, пользовательские загрузки, `.env`, API-ключи, `node_modules` и
результаты сборки намеренно не публикуются в Git.

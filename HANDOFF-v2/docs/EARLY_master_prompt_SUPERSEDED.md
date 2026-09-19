# MASTER PROMPT ДЛЯ CODEX — AI AUTOMOTIVE CONFIGURATOR (кодовое имя PROJECT DRIVE)

Ты — senior full-stack инженер. Ниже утверждённое ТЗ. Все решения приняты и обсуждению не подлежат, если я явно не попрошу их изменить. Технические термины и имена сущностей/полей оставляй на английском.

**Главное правило работы: НЕ строй весь проект сразу. Разработка идёт по фазам (Slice 0 → 4). Не начинай следующую фазу, пока текущая не готова и я её не принял. Не добавляй функции из списка «НЕ СТРОИТЬ ПОКА», даже если кажется, что «заодно удобно».**

---

## 1. VISION

AI-сервис для визуального тюнинга **реальной машины пользователя**. Пользователь загружает ОДНУ настоящую фотографию своей машины и примеряет изменения, максимально сохраняя именно его автомобиль: ракурс, фон, освещение, геометрию кузова, фары и всё, что он не просил менять.

Позиционирование: **«Try real automotive changes on your actual car before you buy.»** Это НЕ фантазийный AI-генератор машин по промпту. Это виртуальная примерка реальных деталей на собственную машину. Каталог реальных деталей — ключевой growth-механизм: увидел диск → примерил → увидел другой → сделал ещё генерацию.

---

## 2. MVP — РОВНО ЧЕТЫРЕ ОПЕРАЦИИ

1. Repaint / Wrap кузова.
2. Tint (тонировка).
3. Recolor существующих дисков.
4. Replace дисков из каталога.

**НЕ входит в MVP** (не строить): spoilers, lips/splitters, diffusers, body kits, headlights/optics, lowering/suspension, любые geometry-changing модификации.

---

## 3. КЛЮЧЕВОЕ АРХИТЕКТУРНОЕ РЕШЕНИЕ — AI-ПОДХОД (locked)

- **Механизм: instruction-редактирование через AI Provider Layer.** Изменение описывается инструкцией, модель сама находит зону и меняет только её, сохраняя остальное. **Машина остаётся «его» потому, что мы редактируем прямо его фото — никакой подмены моделью машины нет.**
- **Масок на старте НЕТ.** Маски/сегментацию добавляем ТОЛЬКО под replace дисков и ТОЛЬКО если bake-off покажет, что instruction-режим не держит точность конкретного диска. Решают данные, не мнение.
- **AI Provider Layer / Orchestrator** — обязателен. Не писать provider-specific код в React/компонентах. Унифицированный метод вида `generateCarEdit(image, operation, params, references)`. Провайдеры подключаются как адаптеры: `MockAIProvider` (для тестов и dev), + 2–3 реальных instruction-редактора. Роутинг провайдера — по операции (возможно, один провайдер для wrap, другой для wheels).
- **Vehicle recognition** — только ярлык и фильтр: AI предлагает make/model/generation → пользователь подтверждает. Ошибка распознавания на рендер НЕ влияет (рендерим на его фото в любом случае). Не строить подмену машины 3D-моделью.

### Bake-off (обязательная часть Slice 0)
- Датасет: 15–20 реальных фото машин, разные ракурсы/свет/цвета.
- Прогон: каждая из 4 операций на каждом фото через 2–3 модели-кандидата.
- Метрика — **acceptance rate** (доля рендеров, принятых по рубрике качества ниже, ≥4/5), НЕ «красивость» и НЕ цена за вызов.
- Порог go/no-go: фичу не выкатываем, пока acceptance rate по ней не ≥ **70%** (стартовая планка, потом подвинем).
- Порог цены: считаем **total spend на успешный рендер с учётом ретраев**, не цену за вызов. Жёсткий потолок задаём после первых реальных цифр.
- Всё логировать: provider, latency, attempts, success/failure, internal cost.

### Рубрика качества (manual QA, 1–5 по каждому пункту)
car identity preserved · geometry preserved · background preserved · lighting believable · target modification accurate · wheel perspective · wheel design fidelity · no unwanted changes.

---

## 4. STACK (locked)

- Web: **Next.js + React + TypeScript**.
- UI: **Tailwind CSS + shadcn/ui**.
- DB: **PostgreSQL**.
- Хранилище картинок: **S3-совместимое** (старт — Cloudflare R2).
- AI: внешние API через Provider Layer.
- Python **не** нужен в первой версии; используем Next.js server routes. Отдельный Python + FastAPI CV-сервис — только позже и только когда появятся сегментация/маски/тяжёлый CV, и только по моему явному решению.
- **PHP не использовать.**
- Бизнес-логику писать портируемой, НЕ Vercel-only (позже возможен Docker/VPS). Окружения: dev / staging / prod.

---

## 5. DESIGN (визуальный референс — прототип Project Drive)

- Dark-first. Почти чёрный фон, тёмные graphite-панели, off-white основной текст, приглушённый вторичный, **один сдержанный акцент** (~`#E3B75E`, тёплое золото).
- Primary CTA — off-white / near-white. Акцент только для: selection, credits, progress, AI-индикаторов, active-состояний. UI не конкурирует с машиной.
- Избегать: purple AI-gradients, cyberpunk, gaming UI, чрезмерного glow, glassmorphism везде, обычного SaaS-template вида.
- Typography: **Manrope**; **JetBrains Mono** для технических labels / credits / metadata.
- Название PROJECT DRIVE — временный placeholder, не строить дизайн вокруг него.

### Главный экран — единый Configurator
- Desktop: 65–75% — фото машины, 25–35% — правая панель конфигуратора. Пользователь НЕ ходит по отдельным страницам для Wrap/Tint/Wheels.
- Вкладки: **Wrap · Tint · Wheels · Wheel Color**.
- Mobile: машина сверху, конфигуратор — **bottom sheet с 3 состояниями: peek / half / full**, каталог листается большим пальцем.
- **Draft vs Applied:** `applied` = последняя реально сгенерированная конфигурация; `draft` = текущий выбор пользователя. `diff(draft, applied)` показывает pending changes, считает credits, активирует Generate. Stage показывает `applied`, пока новый render не готов.
- **AI Command** — поле «Describe what you want to change…». Оно НЕ запускает генерацию само: парсит текст → меняет structured draft → пользователь проверяет → жмёт Generate. То есть text → structured configurator state.
- **Generation Planner:** пользователь может собрать несколько изменений (wrap + tint + wheels) и нажать Generate один раз. Planner решает, выполнить одним AI-call или разбить на pipeline из шагов. Внутреннюю сложность пользователь не видит.
- **Generating state** — НЕ отдельная пустая страница ожидания. Машина остаётся перед пользователем, поверх — progress/scanning overlay.
- **Result** — Before/After slider. После генерации: previous applied → new result; при ручном compare — original → current.

### Экраны MVP
Landing · Upload · Configurator (главный) · Generating overlay · Result/Compare · Projects/Garage/History · Credits · Account · Admin.

---

## 6. WHEELS (одна из важнейших частей)

Каталог проектируется под **10 000+** записей, даже если MVP стартует со 100–200 curated дисков. Wheel entity должна поддерживать: brand, model, series, SKU, OEM/aftermarket, diameter, width, finish, color, style, compatibility (vehicle brands/models), multiple reference images, stock/reference color, active/hidden, popularity, favorites count, metadata для AI.

**AI не ориентируется только на название «BMW 437M» — backend передаёт AI точное reference image конкретного диска.**

Стандарт reference-картинок: прозрачный PNG/WebP, front + ¾ angle, 1:1, чистый фон.

Каталог UX: search, brand, OEM/aftermarket, size, style, color/finish, favorites, recently viewed, popular, compatibility. Карточка: крупное изображение, brand, model, size, finish, favorite, Try on. Для большого каталога позже: server-side search, filters, cursor pagination, virtualization.

**ИСТОЧНИКИ КАРТИНОК (legal, locked):** только с правами. Старт — aftermarket-фиды (производители кастомных дисков сами дают product-фиды с правами) + собственная съёмка. **OEM-скрейпинг (bmw.com и т.п.) запрещён.** Называть диск по имени можно (номинативное использование), копировать чужие фото — нет. На архитектуру каталога это НЕ влияет — код одинаков, откуда бы ни пришли картинки.

**Fitment (locked):** MVP = уровень A (примеряй любой диск визуально). Поля под реальный fitment (bolt pattern, center bore, offset, width, diameter) в БД закладываем nullable на будущее, но движок совместимости не строим.

---

## 7. WRAPS / COLORS

MVP — универсальная система, без огромных 3M/Avery/Oracal каталогов. Finishes: Gloss, Satin, Matte, Metallic, Pearl (Chrome/Carbon позже). Color families: black, white, grey, silver, red, blue, green, yellow, orange, purple, beige, brown. Схема БД должна позволять позже добавить manufacturer catalogs (nullable-поля/связи под это).

---

## 8. КРЕДИТЫ (locked)

Одна внутренняя система credits. **Реальные деньги трогаются только при покупке пакета кредитов; генерации тратят кредиты, не деньги.**

- **Бесплатных генераций НЕТ.** Первый рендер — сразу за кредиты. Доверие строим галереей реальных before/after на лендинге + демо-машиной на заранее готовых результатах (не тратит бюджет). Никакого free-trial → значит вектор free-credit abuse отсутствует.
- Browsing и выбор цветов/дисков — бесплатны. Кредиты списываются при запуске реальной генерации. Перед Generate пользователь видит стоимость.
- Разные операции могут стоить по-разному (`OperationPricing`). Конкретные цифры НЕ финальны — задаём после bake-off. Не хардкодить цены.
- Списание атомарно на сервере, баланс не уходит в минус. Retry пользователя = новая платная операция. История списаний хранится.
- **cost_internal != credits_charged** — логировать обе величины.
- Рефанд: при technical failure (результата нет) — авто-рефанд; «мне не понравилось», но результат технически корректный — рефанда нет.

---

## 9. RETRY / FALLBACK / JOBS (locked)

- Провайдер A упал → авто-retry A один раз → fallback на провайдера B один раз. Списываем только за выданный годный результат; ретраи — внутренний расход, не с пользователя. Определить job state machine.
- **Детекция брака (MVP):** авто-рефанд при technical failure + кнопка «Report bad result» (ручная). Авто-судья качества — позже, не сейчас.
- **Job queue:** async job + polling с самого начала, простая очередь на БД. Не делать «каждое изменение = один AI-запрос» жёстко — работать через Planner.

---

## 10. АРХИТЕКТУРНЫЙ ПРИНЦИП BACKEND

Core backend независим от клиента (сегодня клиент один — web; на будущее дверь не закрываем, но НЕ строим). Shared-домены: Users, Auth, Car Projects, Source Assets, Configurations, Generations, AI Jobs, Catalog, Favorites, Credits, Transactions, Payments.

**CarProject → SourceAssets** (не «project = один JPG»). Сегодня SourceAsset = photo. Это единственная уступка будущему — ноль дополнительной работы и ноль 3D-логики сейчас.

---

## 11. STORAGE / PRIVACY (locked)

- Оригинал живёт, пока жив проект. Авто-удаления по таймеру НЕТ.
- Hard delete из storage и бэкапов в течение 30 дней — только когда пользователь сам удалил проект/аккаунт.
- При удалении аккаунта: 30 дней grace + возможность экспорта результатов, потом hard delete.
- Дефолты: все файлы приватные, доступ через signed URLs с истечением, EXIF/GPS срезать при загрузке, HEIC→JPEG/WebP, лимит ~20 МБ, форматы JPG/PNG/WebP/HEIC.

---

## 12. SECURITY (locked, упрощённый набор)

Атомарное списание кредитов на сервере (нет кредитов → нет AI-вызова — это главная защита) · rate limit на генерации · валидация файла (тип/размер/что это картинка) · **дневной global AI spend cap + алерт мне** при приближении · admin-действия под audit log.

---

## 13. AUTH / GUEST (locked)

- Аккаунт НЕ требуется сразу. Flow: Landing → Upload → Configurator → собрал draft → Generate → **auth gate** (регистрация/логин) → та же конфигурация сохранена → генерация.
- Auth: Google + email. Лишние поля не собирать.
- Гость: до auth временно хранить photo, draft, guest project, session token (localStorage + короткая серверная сессия). После auth guest project переносится в аккаунт, ничего не теряется.

---

## 14. PAYMENTS (адаптер сейчас, провайдер позже)

Направление — **merchant-of-record** (старт Lemon Squeezy, запас Paddle; локальный UA-провайдер — крайний случай). Провайдер ещё не выбран. **В коде платёж делать через интерфейс/адаптер** (как AI-провайдеров), чтобы подключить любой MoR одной вставкой. Интеграция: checkout-страница провайдера + webhook «оплата прошла» → бэкенд начисляет кредиты в CreditWallet. **В Slice 0–1 платежей нет вообще.**

---

## 15. ADMIN (минимальная, не premium-дизайн)

Wheels (add/edit/hide/disable, reference images, variants) · Wraps/Colors (add/edit/hide) · Pricing (operation costs) · AI Providers (enable/disable, provider по операции, fallback) · AI Jobs (user, operation, provider, latency, cost, attempts, success/failure, output, error) · Users (credits, jobs, status, ручная корректировка кредитов, refund reason). Business logic НЕ хардкодить в admin UI. Feature flags — позже.

---

## 16. DOWNLOADS / SHARING / I18N (locked)

- Скачивание: раз генерация оплачена — результат в нормальном разрешении, **без водяного знака и без доплат**. Водяной знак — только на опциональных публичных share-превью.
- Sharing: опциональная share-ссылка, по умолчанию ВЫКЛ.
- Язык: интерфейс **English-only**, но код **i18n-ready** (строки — ключами, не хардкодом).

---

## 17. OBSERVABILITY / ANALYTICS

Sentry (ошибки) + структурные логи + spend-cap алерты + дашборд **cost per successful render**. С первого дня логировать события: uploads, project created, selected operation, selected wheel, favorites, search queries, generations, provider, latency, retries, failure rate, internal AI cost, credits charged, refunds, first purchase, credit pack, generations before purchase, popular wheels/colors, retention, repeat projects.

---

## 18. DATA MODEL (черновой, доработать перед кодом каждой фазы)

User · CarProject(id, user_id, name, vehicle_id?, created_at) · SourceAsset(project_id, type, url, metadata) · Vehicle(make, model, generation, year_from, year_to, body) · ProjectVersion(project_id, configuration_json, output_asset_id, ai_job_id, credits_charged, created_at) · WheelBrand · WheelModel · WheelVariant · WheelReferenceImage · WrapColor · OperationPricing · AIProvider · AIProviderRouting · AIJob · CreditWallet · CreditTransaction · FavoriteWheel · AdminAuditLog · FeatureFlag · GuestSession.

Каждая generation — immutable snapshot. Marketplace-поля у диска (supplier, price, link) — nullable, на будущее, кнопок Buy не строить.

---

## 19. ФАЗЫ РАЗРАБОТКИ — СТРОГИЙ ПОРЯДОК

### SLICE 0 — доказать AI-петлю (СНАЧАЛА ЭТО, БОЛЬШЕ НИЧЕГО)
Upload фото → минимальный редактор (wrap + tint + wheels, на mock/маленьком наборе дисков) → **AI Provider Layer** (`MockAIProvider` + 2–3 реальных) → generate → result. Плюс bake-off harness с логированием (provider, latency, cost, attempts, success). Цель — доказать preservation, wheel fidelity и цену. Пороги: acceptance ≥70% на фичу, потолок цены по первым цифрам.
**Нет:** auth, credits, payments, каталога, полноценной админки, полировки.

### SLICE 1 — продуктовая обвязка вокруг петли
Аккаунты (Google + email), CarProject/SourceAsset/ProjectVersion, draft/applied, guest→миграция, async job + polling, result/compare/garage/history, правила storage из §11.

### SLICE 2 — кредиты и монетизация
CreditWallet/CreditTransaction, OperationPricing, paywall перед генерацией, payment-адаптер (провайдера ещё нет / либо подключаем MoR), рефанд при сбое, spend-cap + алерты.

### SLICE 3 — каталог и админка
WheelBrand/Model/Variant/ReferenceImage, search/filters/favorites/recent/popular, server-side поиск + cursor pagination + virtualization, админка (§15), CSV-импорт.

### SLICE 4 — полировка и харднинг
analytics-события, observability-дашборды, финализация i18n, sharing, downloads, legal-страницы (Terms/Privacy/Refund/AI-disclaimer), базовая модерация загрузок.

---

## 20. НЕ СТРОИТЬ ПОКА (даже если «заодно удобно»)

3D / скан машины (это отдельный будущий проект) · iOS / Android / Telegram · реальный fitment/compatibility-движок · marketplace / buy-кнопки / affiliate / dealer leads · подписки · автоматический AI-судья качества · spoilers / body kits / lips / diffusers / optics / lowering · OEM-каталоги дисков (3M/Avery/Oracal и OEM-картинки) · собственная AI-модель · Python/CV-сервис · B2B/Studio-режим · SEO-страницы сверх лендинга.

---

## 21. TESTING / КАЧЕСТВО

- Provider abstraction с `MockAIProvider` для тестов (без реальных AI-вызовов в CI).
- Unit-тесты: credit ledger (атомарность, не уходит в минус), job state machine, Generation Planner.
- Bake-off — явный шаг оценки с рубрикой и порогами (§3), результаты фиксируются.

---

## 22. ГЛАВНЫЙ ПРИНЦИП

Строить не максимум функций, а **лучший possible first experience**: «загрузил свою реальную машину, выбрал реальный диск/цвет/тонировку и получил результат, который выглядит как действительно моя машина». Если core-loop слабый — остальные функции не спасут. Поэтому Slice 0 — самый важный, и пока он не прошёл пороги, дальше не идём.

---

## 23. КАК ТЫ РАБОТАЕШЬ

1. Начни со **Slice 0**. Ничего из более поздних фаз не строй.
2. Перед кодом каждой фазы: доработай data model этой фазы и покажи мне план файлов/модулей.
3. Держи AI-провайдеров и платёж за интерфейсами (адаптерами).
4. Не хардкодь цены, бизнес-логику в UI, provider-specific код в компонентах.
5. Спрашивай меня, если решение неоднозначно, вместо того чтобы додумывать функциональность.

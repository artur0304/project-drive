# MASTER BRIEF ДЛЯ CLAUDE — AI AUTOMOTIVE CONFIGURATOR / PROJECT DRIVE

Ты подключаешься как senior product strategist, UX/UI designer, software architect и AI-product advisor.

Ниже собран весь контекст проекта: что уже решено, что является рабочей гипотезой, что нельзя менять без причины, и какие вопросы ещё НЕ обсуждены или не зафиксированы.

Твоя задача — сначала понять проект целиком, затем помочь пройти оставшиеся решения по одному, не ломая уже согласованные принципы.

---

# 1. ГЛАВНАЯ ИДЕЯ ПРОЕКТА

Мы создаём AI-сервис для визуального тюнинга реального автомобиля пользователя.

Пользователь загружает ОДНУ настоящую фотографию своей машины и может примерять изменения, максимально сохраняя конкретно его автомобиль, исходный ракурс, фон, освещение, геометрию кузова, фары и детали, которые пользователь не просил менять.

Главная идея продукта:

**“Try real automotive changes on your actual car before you buy.”**

Это не должен быть просто очередной AI car image generator, где человек пишет промпт и получает новую фантазийную машину.

Основная ценность должна быть ближе к:

**“Виртуальная примерка реальных деталей и детейлинг-изменений на твою собственную машину.”**

---

# 2. ДОЛГОСРОЧНОЕ ВИДЕНИЕ

Сейчас создаётся WEB-продукт.

Позже, если веб-версия подтвердит спрос, планируется iOS-приложение с 3D-сканированием автомобиля.

Схема:

Сейчас:
Фото автомобиля → AI-конфигуратор → реальные диски / цвет / плёнка / тонировка → AI-рендер результата.

Позже:
iPhone → 3D-скан автомобиля → точная 3D-модель → тот же каталог деталей → примерка изменений уже в 3D.

Потенциально позже:
- iOS;
- Android;
- Telegram bot;
- режим для детейлинг-студий;
- API;
- 3D scanner;
- 3D parts fitting;
- реальные каталоги обвесов, спойлеров, оптики и других компонентов.

Очень важно: WEB не должен быть архитектурным тупиком.

Аккаунты, кредиты, каталог, проекты, платежи, AI jobs и generated versions должны быть общим backend-core, к которому позже сможет подключаться iOS.

---

# 3. ОСНОВНОЕ ПОЗИЦИОНИРОВАНИЕ

Не позиционировать как просто “AI Car Customizer”. Это слишком банально и уже конкурентно.

Сильнее:
- “See real modifications on your own car before buying.”
- “Try real wheels, wraps and styling changes on your actual car.”

Большой стратегический акцент — реальные каталоги.

Пример UX:
BMW → Style 437M → R20 → Ferric Grey → Try on my car.

Пользователь не обязан знать точное название детали заранее — продукт должен провоцировать browsing.

Каталог — один из главных growth-механизмов: человек увидел один диск → попробовал → увидел другой → сделал ещё генерацию.

---

# 4. WEB MVP — ЗАФИКСИРОВАННЫЙ ФУНКЦИОНАЛ

Первая версия поддерживает только:
1. Repaint / Wrap кузова.
2. Tint.
3. Изменение цвета существующих дисков.
4. Замена дисков из каталога.

ПОКА НЕ ДЕЛАЕМ:
- spoilers;
- lips / splitters;
- diffusers;
- body kits;
- headlights / optics;
- lowering / suspension;
- geometry-changing modifications.

Причина: они сложнее для AI, чаще портят геометрию и требуют более специализированной логики.

---

# 5. ГЛАВНЫЙ UX-ПРИНЦИП

После загрузки фото пользователь работает преимущественно в одном главном редакторе.

Desktop:
- 65–75% — фотография автомобиля;
- 25–35% — configurator panel.

Пользователь НЕ должен постоянно переходить между отдельными страницами для Wrap / Tint / Wheels.

Основные вкладки:
- Wrap
- Tint
- Wheels
- Wheel Color

На mobile:
- машина остаётся сверху;
- конфигуратор становится bottom sheet;
- bottom sheet имеет несколько состояний;
- пользователь удобно листает каталог большим пальцем.

Во втором прототипе предложены 3 состояния:
- peek;
- half;
- full.

Эта идея нам нравится.

---

# 6. ОСНОВНЫЕ ЭКРАНЫ

Нужны:
1. Landing.
2. Upload.
3. Main Configurator.
4. Generating state.
5. Result / Compare.
6. Projects / Garage / History.
7. Credits.
8. Account.
9. Admin panel.

Generating желательно НЕ делать отдельной пустой страницей ожидания.

Сильнее вариант, когда машина остаётся перед пользователем, а поверх показывается progress / scanning overlay.

---

# 7. ДИЗАЙН — ЧТО ВЫБРАНО

Было два Claude-прототипа:
- VISOR;
- PROJECT DRIVE.

Второй вариант, PROJECT DRIVE, выбран как основной дизайн-направление.

Почему:
- более зрелый editor;
- правильный draft/applied state;
- AI command встроен в editor;
- полноценнее mobile bottom sheet;
- лучше продуман wheel catalog;
- лучше engineering handoff;
- выглядит больше как настоящий продукт.

Основной стиль:
PREMIUM AUTOMOTIVE + MODERN TECH.

Избегать:
- purple AI gradients;
- cyberpunk;
- gaming UI;
- чрезмерного glow;
- glassmorphism everywhere;
- обычного SaaS-template вида.

Главный объект интерфейса — машина. UI не должен конкурировать с ней.

---

# 8. DESIGN SYSTEM — ТЕКУЩЕЕ НАПРАВЛЕНИЕ

Из выбранного Project Drive:
- Dark-first UI.
- почти чёрный фон;
- тёмные graphite panels;
- off-white primary text;
- muted secondary text;
- один restrained accent.

В Project Drive accent примерно золотистый / warm yellow: #E3B75E.

Primary CTA лучше делать off-white / near-white, а accent использовать для:
- selection;
- credits;
- progress;
- AI indicators;
- active states.

Typography:
- Manrope;
- JetBrains Mono для технических labels / credits / metadata.

Название PROJECT DRIVE — временный placeholder. Бренд пока НЕ выбран.

---

# 9. WHEELS — ОДНА ИЗ САМЫХ ВАЖНЫХ ЧАСТЕЙ

Каталог должен быть спроектирован не под 100 дисков, а под 10 000+.

Даже если MVP стартует только со 100–200 curated wheels.

Каждая wheel entity должна потенциально поддерживать:
- brand;
- model;
- series;
- SKU;
- OEM / aftermarket;
- diameter;
- width;
- finish;
- color;
- style;
- compatibility;
- vehicle brands/models;
- multiple reference images;
- stock/reference color;
- active / hidden;
- popularity;
- favorites count;
- metadata for AI.

Пример:
BMW → Style 437M → R19 / R20 → Ferric Grey / Black.

AI не должен ориентироваться только на название “BMW 437M”. Backend должен передавать AI точное reference image конкретного диска.

---

# 10. WHEEL CATALOG UX

Нужны:
- search;
- brand;
- OEM / aftermarket;
- size;
- style;
- color / finish;
- favorites;
- recently viewed;
- popular;
- compatibility;
- potentially sort.

Карточка диска:
- достаточно крупное изображение;
- brand;
- model;
- size;
- finish;
- favorite;
- Try on.

Главный UX-эффект: пользователь должен хотеть листать и примерять много вариантов.

Для большого каталога позже понадобится:
- server-side search;
- filters;
- cursor pagination;
- virtualization.

---

# 11. СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ ЗАМЕНЫ ДИСКОВ

Wheel replacement — одна из самых сложных функций MVP.

Это не обязательно отдельная AI-модель. Это отдельный внутренний модуль / pipeline.

Пример логики:
1. Пользователь выбирает точную модель диска.
2. Backend получает reference image(s).
3. Используется исходное фото автомобиля.
4. Система определяет или помогает AI определить зоны колёс.
5. AI получает instruction заменить только колёса.
6. Всё остальное должно быть максимально сохранено.
7. Результат потенциально валидируется.
8. Если результат плохой — retry / fallback provider.

AI обычно понимает перспективу, но не идеально.

Поэтому wheel replacement должен иметь больше контроля, чем простая перекраска.

Долгосрочно сюда можно добавить:
- wheel masks;
- segmentation;
- pose estimation;
- 3D wheel reference;
- perspective matching.

---

# 12. WRAPS / COLORS

MVP не начинает с огромного каталога 3M/Avery/Oracal.

Сначала универсальная система.

Finishes:
- Gloss;
- Satin;
- Matte;
- Metallic;
- Pearl;
- потенциально Chrome;
- Carbon-look позже.

Color families:
- black;
- white;
- grey;
- silver;
- red;
- blue;
- green;
- yellow;
- orange;
- purple;
- beige;
- brown.

Архитектура базы должна позволять позже добавить реальные manufacturer catalogs: 3M, Avery Dennison, Oracal, KPMF, Inozetek и т.д.

---

# 13. MULTIPLE CHANGES / GENERATION PLANNER

Не делать жёсткую модель “каждое изменение = один AI запрос”.

Пользователь может собрать:
- Satin Dark Green;
- Tint 20%;
- BMW 437M;
- Black wheels.

И нажать Generate один раз.

Backend должен иметь Generation Planner.

Planner решает: можно ли выполнить всё одним AI-call или лучше разбить pipeline на несколько шагов.

Пользователь не должен видеть внутреннюю сложность.

---

# 14. DRAFT VS APPLIED

Из второго дизайна понравилась идея:

applied = последняя реально сгенерированная конфигурация.

draft = то, что пользователь сейчас выбрал, но ещё не сгенерировал.

diff(draft, applied):
- показывает pending changes;
- считает credits;
- активирует Generate.

Stage показывает applied, пока новый render не готов.

Это хороший принцип и его стоит сохранить.

---

# 15. AI COMMAND

Дополнительное поле:
“Describe what you want to change…”

Пример:
“Make it dark green satin, tint the windows and try aggressive black wheels.”

Но AI command НЕ должен сам запускать generation.

Он должен:
- распарсить текст;
- изменить structured draft;
- показать пользователю выбранные настройки;
- пользователь проверяет;
- нажимает Generate.

То есть Text → structured configurator state.

---

# 16. AI PROVIDERS

Не привязывать систему к одному AI provider.

Архитектура: AI Provider Layer / AI Orchestrator.

Пример unified method:
generateCarEdit(image, operation/configuration, parameters, references).

Поддерживать:
- OpenAI image provider;
- FLUX;
- future providers;
- MockAIProvider;
- позже own model.

Не писать provider-specific code прямо в React components.

---

# 17. ВЫБОР AI-МОДЕЛИ — НЕ ЗАФИКСИРОВАН

Нельзя заранее решить, что OpenAI или FLUX лучший.

Тест делаем очень рано во время разработки:
1. Построить минимальный editor.
2. Upload.
3. Backend AI provider abstraction.
4. Logging.
5. Взять 10–20 реальных фотографий машин.
6. Прогнать через 2–3 providers.
7. Сравнить preservation of exact car, background, wheel accuracy, wrap accuracy, tint accuracy, unwanted changes, latency, retries, failure rate, real cost per successful render.

Главная метрика:
НЕ cost per API call,
а total AI spend including retries / successful acceptable outputs.

Вполне возможно, один provider используется для wrap, другой для wheel replacement.

---

# 18. КРЕДИТЫ — ЗАФИКСИРОВАННЫЙ ПРИНЦИП

Одна внутренняя система credits.

Пользователь покупает credits.

Разные операции могут иметь разные цены.

Конкретные цифры ЕЩЁ НЕ ЗАФИКСИРОВАНЫ.

Никакие текущие 25 / 15 / 25 / 15 не считать финальными.

Правила:
1. Browsing бесплатный.
2. Выбор цветов/дисков бесплатный.
3. Credits списываются при запуске реальной generation.
4. Перед Generate пользователь видит стоимость.
5. Если technical failure и результата нет — refund.
6. Если система сама считает output явно broken — refund.
7. Если output технически корректный, но “мне просто не понравилось” — автоматического refund нет.
8. Retry пользователя обычно новая платная operation.
9. Balance не уходит в минус.
10. История списаний хранится.

Internal economics:
cost_internal != credits_charged.

Нужно логировать обе величины.

---

# 19. КРЕДИТНЫЕ ПАКЕТЫ — НЕ ЗАФИКСИРОВАНЫ

Не считать текущие цены Claude финальными.

После AI test определяем:
- cheapest operation;
- базовый unit;
- стоимость credits;
- margin.

Идея: самую дешёвую операцию можно условно считать 10 credits, а более дорогие масштабировать. Но это пока только принцип.

---

# 20. FREE TRIAL / FREE CREDITS

Идея: дать новому пользователю примерно одну бесплатную полноценную generation.

НЕ давать много бесплатных попыток.

Количество free credits пока не определено.

Важно: free credits должны реально покрывать хотя бы одну meaningful generation.

---

# 21. РЕГИСТРАЦИЯ — РЕШЕНИЕ

Не требовать аккаунт сразу.

Flow:
Landing → Upload → Configurator → user builds draft → Generate → auth gate → registration/login → same configuration is preserved → generation starts.

То есть аккаунт нужен перед первой реальной AI generation.

Важно: после auth нельзя терять uploaded photo, selected wrap, tint, wheels, draft.

Стартовый auth:
- Google;
- email.

Не собирать лишние поля.

---

# 22. ADMIN PANEL — ТЕКУЩЕЕ РЕШЕНИЕ

Админка нужна с самого начала, но она не должна быть premium-design проектом.

Минимум:

Wheels:
- add;
- edit;
- hide;
- disable;
- reference images;
- variants.

Wraps / Colors:
- add/edit/hide.

Pricing:
- operation costs.

AI Providers:
- enable/disable provider;
- select provider by operation;
- fallback;
- later routing rules.

AI Jobs:
- user;
- operation;
- provider;
- latency;
- cost;
- attempts;
- success/failure;
- output;
- error.

Users:
- credits;
- jobs;
- account status;
- manual credit adjustment;
- refund reason.

Feature flags желательно позже.

Принцип: business logic не хардкодить в admin UI.

---

# 23. BACKEND / STACK — ТЕКУЩЕЕ РЕШЕНИЕ

Web:
Next.js + React + TypeScript.

UI:
Tailwind CSS + shadcn/ui.

Database:
PostgreSQL.

Images:
S3-compatible storage.

AI:
external APIs через Provider Layer.

Python НЕ нужен обязательно в первой версии.

Сначала можно использовать Next.js backend/server routes.

Позже, когда появятся segmentation, custom computer vision, heavy image processing, masks, own AI models — создать отдельный Python + FastAPI AI/CV service.

Не начинать с PHP.

---

# 24. АРХИТЕКТУРНЫЙ ПРИНЦИП

Core backend должен быть независим от конкретного клиента.

Core Backend
├── Web
├── iOS
├── Android
├── Telegram
├── Studio mode
└── future 3D client

Основные shared domains:
- Users;
- Auth;
- Car Projects;
- Source Assets;
- Configurations;
- Generations;
- AI Jobs;
- Catalog;
- Favorites;
- Credits;
- Transactions;
- Payments.

---

# 25. CAR PROJECT — СРАЗУ С РАСЧЁТОМ НА 3D

Не жёстко Project = one JPG.

Лучше:
CarProject → SourceAssets.

Сегодня SourceAsset:
- photo.

Позже:
- photo_set;
- depth map;
- LiDAR;
- scan data;
- 3D model;
- texture set.

Таким образом будущий iOS 3D scanner сможет использовать тот же project model.

---

# 26. FUTURE iOS 3D SCANNER

Сейчас НЕ строим.

Но архитектуру не закрываем.

Будущая идея:
iPhone camera / LiDAR where available → guided scan around car → reconstruction → 3D vehicle model → real parts fitting.

Потенциальная сильная moat-функция.

Но утверждение “у этого вообще нет конкурентов” пока НЕ считать доказанным. Перед этой фазой нужно отдельное deep competitor research по vehicle photogrammetry, iPhone LiDAR car scanning, 3D tuning, AR wheel fitting, automotive digital twins, aftermarket configurators.

---

# 27. COMPETITIVE LANDSCAPE — ЧТО УЖЕ ОБСУЖДАЛИ

Основные типы конкурентов:

AI photo editors:
- Car Editor;
- MODCAR.ai;
- AutoMod;
- RevvUp;
- ModMyCar;
- Mody и др.

3D configurators:
- 3DTuning.

Wheel visualizers:
- отдельные wheel-specific services.

Вывод: рынок AI car customization уже конкурентный, но рынок фрагментирован.

Наша защита не должна быть “у нас тоже AI”.

Сильнее:
- real parts catalog;
- exact references;
- preservation of real car;
- superior wheel fitting;
- product browsing;
- later 3D.

Особенно следить за MODCAR.ai: они тоже двигаются в сторону parts library и upload own parts.

---

# 28. STORAGE / PRIVACY / FILE RETENTION — ЕЩЁ НЕ ОБСУЖДЕНО

Нужно принять решения:
- сколько хранить original uploads;
- сколько хранить generations;
- удалять ли originals после N дней;
- что происходит при удалении account;
- возможность удалить отдельный car project;
- max upload size;
- supported formats;
- image normalization;
- metadata stripping;
- EXIF privacy;
- CDN;
- signed URLs;
- private vs public images;
- backups;
- storage cost.

---

# 29. SECURITY / ABUSE PREVENTION — ЕЩЁ НЕ ОБСУЖДЕНО

Критично, потому что каждый AI-call стоит денег.

Нужно решить:
- rate limits;
- per-user generation limits;
- IP/device abuse protection;
- free-credit abuse;
- request queue;
- provider budget cap;
- daily AI spend cap;
- max concurrent jobs;
- file validation;
- malicious uploads;
- auth session security;
- payment fraud;
- admin permissions;
- audit logs.

---

# 30. CATALOG SOURCING / RIGHTS — ЕЩЁ НЕ ОБСУЖДЕНО ДО КОНЦА

Нельзя просто скачать 20 000 картинок из Google.

Нужно решить:
- где брать wheel catalog data;
- manufacturer feeds;
- distributors;
- partnerships;
- affiliate feeds;
- product datasets;
- APIs;
- licensing;
- trademarks;
- image rights;
- attribution requirements;
- OEM image use;
- user-uploaded reference parts.

---

# 31. WHEEL COMPATIBILITY — ЕЩЁ НЕ РЕШЕНО

Нужно решить уровень точности.

A. Pure visual catalog — можно примерить любой диск.

B. Basic compatibility — brand/model/size.

C. Real fitment:
- bolt pattern;
- center bore;
- offset;
- width;
- diameter;
- brake clearance;
- tire dimensions.

Для коммерческого продукта в будущем C намного сильнее. Но MVP можно начать проще.

---

# 32. VEHICLE IDENTIFICATION — ЕЩЁ НЕ РЕШЕНО

После upload нужно ли AI автоматически определять:
- brand;
- model;
- generation;
- body;
- year range?

Или пользователь сам выбирает?

Возможный hybrid:
AI suggests → user confirms.

Это важно для compatibility, project naming, search и recommendations.

---

# 33. REAL PARTS COMMERCE — ЕЩЁ НЕ РЕШЕНО

Позже можно добавить:
- price;
- supplier;
- availability;
- buy button;
- affiliate links;
- dealer leads.

Это может стать отдельной monetization layer.

Но MVP сейчас — visualization, не marketplace.

---

# 34. MONETIZATION — ЧТО ЕЩЁ НЕ РЕШЕНО

Сейчас базовая модель:
pay-as-you-go credits.

Не подписка на старте.

Но позже потенциально:
- subscription;
- discounted credit packs;
- B2B plans;
- API;
- affiliate commissions;
- promoted parts;
- dealer leads.

---

# 35. B2B / DETAILING STUDIOS

Первичный пользователь: обычный car owner.

Detailing studio НЕ является центром MVP.

В будущем B2B возможен как:
- sales visualization;
- remote quote;
- upsell;
- branded showroom;
- embed configurator;
- customer presentations.

Комиссия за каждый detailing job — сомнительная модель, её легко обходить.

Не добавлять сейчас отдельный Studio product без причины.

---

# 36. ANALYTICS — ЕЩЁ НУЖНО ЗАФИКСИРОВАТЬ

С первого дня логировать:
- uploads;
- project created;
- selected operation;
- selected wheel;
- favorites;
- search queries;
- generations;
- provider;
- latency;
- retries;
- failure rate;
- internal AI cost;
- credits charged;
- refunds;
- first purchase;
- credit pack;
- number of generations before purchase;
- popular wheels;
- popular colors;
- retention;
- repeat projects.

Особенно важна экономика: cost per successful render.

---

# 37. GENERATION QUALITY METRICS — ЕЩЁ НУЖНО ОПРЕДЕЛИТЬ

Можно завести manual QA rubric 1–5:
- car identity preserved;
- geometry preserved;
- background preserved;
- lighting believable;
- target modification accurate;
- wheel perspective;
- wheel design fidelity;
- no unwanted changes.

Это поможет сравнивать providers.

---

# 38. FAILED GENERATION DETECTION — ЕЩЁ НЕ РЕШЕНО

Как автоматически понять, что результат плохой?

Варианты:
- basic heuristics;
- image similarity;
- segmentation;
- second AI judge;
- user report;
- manual review for beta.

На старте, возможно, technical failure + user “Report bad result”. Позже automated validation.

---

# 39. RETRIES / FALLBACK PROVIDERS — ЕЩЁ НЕ ЗАФИКСИРОВАНО

Нужно решить:
если Provider A failed:
- автоматически retry A?
- route to Provider B?
- сколько попыток?
- когда refund?
- считается ли retry internal cost only?

Нужно определить job state machine.

---

# 40. JOB QUEUE — ЕЩЁ НЕ ОБСУЖДЕНО

Когда пользователей станет больше, нужна очередь AI jobs.

Нужно решить MVP:
- synchronous waiting?
- async job + polling?
- websocket/SSE?
- queue provider?

Правильнее концептуально AI job делать asynchronous уже с начала.

---

# 41. PAYMENT PROVIDER — ЕЩЁ НЕ РЕШЕНО

Нужно выбрать:
- Stripe;
- украинский provider;
- Paddle / merchant of record;
- другое.

Зависит от географии, налогов, payout availability, currencies, chargebacks.

---

# 42. INTERNATIONALIZATION — ЕЩЁ НЕ РЕШЕНО

Планируется международный продукт.

Нужно определить:
- interface language at launch;
- English only?
- English + Ukrainian?
- Russian?
- i18n architecture;
- currencies;
- regional payment methods.

UI лучше сразу строить i18n-ready.

---

# 43. PUBLIC SHARING — НЕ РЕШЕНО

Нужно ли пользователю:
- share result link;
- public project page;
- image export;
- watermark;
- social share.

Не считать “4K PNG + public link 30 days” утверждённым — это было решение Claude prototype.

---

# 44. DOWNLOADS — НЕ РЕШЕНО

Нужно определить:
- output resolution;
- JPG/PNG;
- watermark;
- free vs paid download;
- original resolution;
- upscaling.

---

# 45. PROJECT HISTORY / VERSIONING

Основная идея принята:
Car Project → Original → V1 → V2 → V3.

User может:
- открыть старую version;
- compare;
- duplicate;
- continue editing.

Рекомендация: каждое generation — immutable snapshot.

---

# 46. BEFORE / AFTER

Нужен slider.

После нового render before можно показывать либо original, либо previous applied.

В Project Drive предложено:
- после generation compare previous applied → new result;
- при ручном compare можно original → current.

Это хорошая схема.

---

# 47. SAVING

Нужно решить autosave или explicit Save.

Для projects лучше autosave.

Generated version автоматически сохраняется.

Draft можно хранить в localStorage, backend autosave или session state.

До registration draft должен временно сохраняться в browser/session.

---

# 48. GUEST SESSION — ЕЩЁ НУЖНО ПРОДУМАТЬ ТЕХНИЧЕСКИ

Поскольку пользователь может upload/configure до auth, нужно временно хранить:
- photo;
- draft;
- guest project;
- session token.

После auth guest project переносится в account.

Нужно решить, как долго хранить guest upload.

---

# 49. SEO / LANDING — ЕЩЁ НЕ ОБСУЖДЕНО ГЛУБОКО

Landing нужен не только красивый.

Позже могут понадобиться pages:
- wheel visualizer;
- wrap visualizer;
- car color changer;
- specific brands;
- SEO pages.

Но не перегружать MVP.

---

# 50. ADMIN CATALOG IMPORT — ЕЩЁ НЕ РЕШЕНО

Если каталог вырастет до 10 000, ручное добавление невозможно.

Нужно позже:
- CSV import;
- bulk upload;
- API importer;
- image processing;
- deduplication;
- validation.

MVP admin может быть manual + CSV.

---

# 51. IMAGE REFERENCE PIPELINE — ЕЩЁ НУЖНО РЕШИТЬ

Для wheels reference images лучше стандартизировать.

Вопросы:
- transparent PNG/WebP?
- front view;
- angle view;
- multiple views;
- 1:1;
- standardized lighting;
- background removal.

Хороший reference dataset может быть реальным moat.

---

# 52. TECHNICAL IMAGE PROCESSING — НЕ ЗАФИКСИРОВАНО

Перед AI возможно:
- resize;
- orientation fix;
- EXIF rotate;
- normalize;
- compression;
- segmentation;
- masks.

Не делать слишком сложный CV pipeline до тестов.

---

# 53. DEPLOYMENT — ЕЩЁ НЕ ЗАФИКСИРОВАНО

Начальная идея:
- local development;
- Next.js deploy;
- managed PostgreSQL;
- S3/R2;
- environment secrets.

Vercel возможен для старта.

Но бизнес-логику не делать Vercel-only.

Позже Docker/VPS/cloud migration должна быть возможна.

Нужно определить dev / staging / prod.

---

# 54. OBSERVABILITY — ЕЩЁ НЕ ОБСУЖДЕНО

Нужно:
- error tracking;
- logs;
- provider errors;
- cost monitoring;
- alerts;
- uptime;
- job tracing.

Особенно нужны spend alerts.

---

# 55. MODERATION / SAFETY — ЕЩЁ НЕ ОБСУЖДЕНО

Поскольку пользователь загружает изображения, нужно решить:
- разрешаем только автомобили?
- что делать с изображениями людей?
- abusive content;
- NSFW;
- license plates;
- personal data.

Вероятно достаточно provider safety + file rules на MVP, но privacy policy нужна.

---

# 56. LEGAL DOCUMENTS — ЕЩЁ НЕ ОБСУЖДЕНО

До публичного запуска:
- Terms;
- Privacy Policy;
- Refund policy;
- copyright;
- catalog rights;
- AI disclaimer;
- user-upload rights.

---

# 57. BRAND / NAME — НЕ РЕШЕНО

PROJECT DRIVE и VISOR — placeholders.

Не тратить сейчас много времени.

Сначала product.

Позже:
- naming;
- domain;
- trademark screening.

---

# 58. ЧТО НЕ СЧИТАТЬ ФИНАЛЬНЫМ ИЗ CLAUDE PROTOTYPE

НЕ считать утверждённым:
- 10,000+ wheels marketing claim;
- exact credit prices;
- Studio credit package;
- re-roll cost 10;
- black calipers;
- painted lip;
- 4K PNG included;
- public links 30 days;
- legal-limit-aware tint;
- specific download rules;
- user data from prototype;
- exact account fields.

Prototype — visual/UX reference, не source of truth для бизнеса.

---

# 59. ЧТО СЧИТАТЬ LOCKED / ПОЧТИ LOCKED

Locked:
- Web first.
- One-photo MVP.
- Four modification categories.
- Single main editor.
- Right panel desktop.
- Bottom sheet mobile.
- Real wheel catalog direction.
- Catalog designed for 10k+.
- AI provider abstraction.
- Early multi-provider test.
- Credits.
- No account required before configuring.
- Auth before real generation.
- Minimal admin.
- Next.js/React/TypeScript.
- PostgreSQL.
- S3-compatible storage.
- Python service later only when justified.
- Project Drive is preferred visual direction.
- Future 3D iOS should reuse backend core.

Almost locked:
- draft/applied state;
- AI command → structured draft;
- async AI jobs;
- previous result compare;
- three-snap mobile bottom sheet.

---

# 60. РАБОЧАЯ DATA MODEL — НЕ ФИНАЛЬНАЯ

User

CarProject
- id
- user_id
- name
- vehicle_id?
- created_at

SourceAsset
- project_id
- type
- url
- metadata

Vehicle
- make
- model
- generation
- year_from
- year_to
- body

ProjectVersion
- project_id
- configuration_json
- output_asset_id
- ai_job_id
- credits_charged
- created_at

WheelBrand
WheelModel
WheelVariant
WheelReferenceImage
WrapColor
OperationPricing
AIProvider
AIProviderRouting
AIJob
CreditWallet
CreditTransaction
FavoriteWheel
AdminAuditLog
FeatureFlag

Это надо ещё нормально спроектировать перед coding.

---

# 61. РЕКОМЕНДУЕМЫЙ USER FLOW

Guest:
Landing → Upload → Configurator → configure draft → Generate → Login / Sign up → generation → Result → project saved → continue editing → credits purchase when needed.

Returning user:
Login → Projects → open car → edit → Generate.

---

# 62. ЧТО НУЖНО ОБСУДИТЬ ДАЛЬШЕ — ПОРЯДОК

Предлагаемый порядок оставшихся решений:
1. Storage / image retention.
2. Security / abuse prevention.
3. Wheel catalog sourcing / legal rights.
4. Vehicle recognition.
5. Fitment / compatibility level.
6. Analytics.
7. AI quality evaluation rubric.
8. Failed-generation detection.
9. Retry / fallback strategy.
10. AI job queue architecture.
11. Payment provider.
12. Guest session migration.
13. Downloads / share links.
14. Internationalization.
15. Privacy / legal.
16. Deployment.
17. Observability.
18. Catalog bulk import.
19. Future marketplace / affiliate layer.
20. 3D roadmap constraints.

Не нужно принимать всё сразу. Лучше обсуждать по одному и фиксировать.

---

# 63. ЧТО Я ХОЧУ ОТ ТЕБЯ, CLAUDE

Не строй проект заново.

Не меняй locked decisions просто ради альтернативы.

Сначала:
1. Прочитай весь brief.
2. Найди противоречия.
3. Отдели locked / assumptions / unresolved.
4. Укажи, если забыли критически важный продуктовый или технический вопрос.
5. Затем помогай обсуждать unresolved items ПО ОДНОМУ.
6. Для каждого объясни проблему простыми словами, дай 2–3 варианта, плюсы/минусы, свою рекомендацию и не переходи дальше, пока решение не принято.

Позже, когда всё будет зафиксировано, нужен будет отдельный финальный MASTER PROMPT FOR CODEX.

В нём должны быть:
- vision;
- MVP;
- architecture;
- design reference;
- stack;
- database;
- AI provider abstraction;
- credits;
- wheel catalog;
- generation planner;
- security;
- admin;
- testing;
- phased implementation;
- explicit “do not build future features yet”.

Codex не должен получать команду “сделай весь проект сразу”. Разработка должна идти по этапам.

---

# 64. ГЛАВНЫЙ ПРИНЦИП ПРОЕКТА

Не строить максимум функций.

Строить лучший possible first experience:

**“Я загрузил свою реальную машину, выбрал реальный диск/цвет/тонировку и получил результат, который выглядит так, будто это действительно моя машина.”**

Если это работает хорошо — дальше можно масштабировать каталог, AI, commerce и 3D.

Если качество этой core-loop слабое — остальные функции не спасут продукт.

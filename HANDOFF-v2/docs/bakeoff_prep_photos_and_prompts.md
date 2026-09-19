# Bake-off prep — фото и промпты (Slice 0)

Готовим заранее, чтобы в день теста только прогнать. Денег не требует.

---

## Часть 1 — какие фото снять (15–20 штук)

Цель набора: проверить сохранение машины в разных условиях + нащупать, где модель ломается.
Не снимай 20 одинаковых кадров — меняй условия специально.

Общие требования к каждому кадру:
- вся машина в кадре, целиком (не обрезана);
- нормальное разрешение (с телефона — ок), без сильной темноты и без размытия;
- реальные машины: твоя, друга, любые доступные — достаточно 2–4 разных авто.

Набор по ракурсам (примерное распределение):
- **5 × front ¾** (перёд под углом) — главный рабочий ракурс.
- **3 × rear ¾** (зад под углом).
- **3 × side profile** (строго сбоку) — лучший ракурс, чтобы видеть диски.
- **2 × front-on** (перёд в лоб).
- **2 × сложные случаи:** глянцевый чёрный кузов и кадр с «замусоренным» фоном (улица, другие машины) — это стресс-тест на сохранение.

Что специально варьировать внутри набора:
- **Цвет кузова:** обязательно и светлые (белый/серебро), и тёмные (чёрный). Тёмный глянец — самый трудный для смены плёнки.
- **Свет:** яркий день, пасмурно (плоский свет), тень, золотой час. Один кадр в слабом свете (но не в темноте) — посмотреть, где начинает врать.
- **Тип кузова:** седан, купе/спорт, внедорожник — разные пропорции и арки.
- **Видимость дисков:** минимум в 7–8 кадрах диски видно крупно и чётко — они нужны для перекраса и замены дисков.

Отдельно для операции «замена дисков»:
- подготовь **2–3 картинки дисков** (референс) — чистый фон, вид спереди и ¾. Для приватного теста подойдёт любое чёткое фото диска; для реального каталога позже нужны картинки с правами (aftermarket-фиды / своя съёмка).

---

## Часть 2 — промпты под каждую операцию

Промпты на английском (модель так понимает лучше, и продукт у нас English-only).
Копируешь фразу, подставляешь цвет/уровень, прикладываешь фото.

**Общая приписка сохранения** (идёт в конце каждого промпта):
> Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

### 1. Wrap (плёнка / цвет кузова)
Шаблон:
> Change the body wrap of this car to [COLOR NAME] ([HEX]) with a [FINISH] finish. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

Готовые примеры:
> Change the body wrap of this car to satin racing green (#3E5B44) with a satin finish. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

> Change the body wrap of this car to matte black (#141414) with a matte finish. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

### 2. Tint (тонировка)
Шаблон:
> Apply [LEVEL] window tint (about [X]% VLT) to this car. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

Уровни: light ~50% · medium ~35% · limo ~20% · black-out ~5%.

Пример:
> Apply dark limo window tint (about 20% VLT) to this car. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

### 3. Wheel recolor (перекрас существующих дисков)
Шаблон:
> Recolor the existing wheels of this car to [COLOR] ([HEX]) with a [FINISH] finish, keeping the same wheel design. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

Пример:
> Recolor the existing wheels of this car to gloss black (#161616) with a gloss finish, keeping the same wheel design. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

### 4. Wheel replace (замена дисков) — прикладываешь фото машины + картинку диска
Шаблон:
> Replace the wheels on this car with the wheels shown in the reference image, matching their exact design and fitting the car's perspective and wheel size. Keep the exact same car, camera angle, background, lighting, body geometry, headlights, reflections and every detail that is not explicitly changed. Do not alter anything else.

---

## Часть 3 — как оценивать результат (рубрика)

По каждому рендеру ставь 1..5 по этим пунктам, смотри именно на них:
- машина осталась той же (identity);
- геометрия кузова не поплыла;
- фон сохранён;
- свет правдоподобный;
- нужное изменение действительно применено;
- (для дисков) диск встал в правильную перспективу;
- (для дисков) дизайн диска совпал с референсом;
- нет лишних, не заказанных изменений.

Правила:
- рендер **принят**, если средний балл ≥ 4/5;
- операция **проходит (go)**, если принято ≥ 70% рендеров по ней;
- по деньгам смотрим **стоимость одного успешного рендера** (с учётом ретраев), а не цену за вызов.

---

## Как прогнать (когда будут кредиты)

Быстрый ручной способ — прямо в AI Studio, без кода:
1. Выбрать модель Nano Banana (напр. `gemini-3-pro-image-preview`).
2. Загрузить фото машины (для замены дисков — ещё и картинку диска).
3. Вставить нужный промпт, нажать Generate.
4. Оценить по рубрике, записать балл и (позже) стоимость.

Когда убедимся, что модель держит машину — переключаемся на автоматический прогон через адаптер (он уже написан), чтобы прогнать все 15–20 фото разом.

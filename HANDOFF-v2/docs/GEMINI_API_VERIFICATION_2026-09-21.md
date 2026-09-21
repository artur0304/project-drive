# Gemini image API — проверка без генерации

Дата проверки: **21.09.2026**. Никаких запросов к модели и списаний при этой проверке не было.

## Что подтверждено

- Рекомендуемый интерфейс Google с июня 2026 года — `POST https://generativelanguage.googleapis.com/v1beta/interactions`. Старый `generateContent` ещё поддерживается, но считается legacy.
- Авторизация: `x-goog-api-key: $GEMINI_API_KEY`; тело — JSON.
- Редактирование передаёт массив `input`: текст `{type:"text", text}` и изображения `{type:"image", mime_type, data}` с base64.
- Формат результата задаётся `response_format: {type:"image"}`. Итоговая картинка находится в image-блоке ответа `steps[].content[]`; SDK также предоставляет `output_image`.
- Inline-данные подходят, когда общий запрос меньше 20 MB. Для больших или повторно используемых файлов нужен Files API.
- Все созданные Gemini изображения содержат невидимый SynthID watermark.

## Актуальные стабильные модели

| Роль в тесте | Код модели | Цена стандартного 1K результата* |
|---|---|---:|
| Самая дешёвая, ступень 1 | `gemini-3.1-flash-lite-image` | $0.0336 |
| Баланс, ступень 2 | `gemini-3.1-flash-image` | $0.067 |
| Максимальное качество, ступень 2 | `gemini-3-pro-image` | $0.134 |

\* Цена только выходного изображения по официальному прайсу на дату проверки. Входные изображения, текст и thinking оплачиваются отдельно. Поэтому бюджетный резерв в коде должен быть выше этой цифры, а реальная стоимость фиксируется по биллингу.

`gemini-2.5-flash-image` — устаревающая модель; Google указывает отключение 02.10.2026. Для нового bake-off её не используем. Старое имя `gemini-3-pro-image-preview` заменено стабильным `gemini-3-pro-image`.

## Что изменено в адаптере

- endpoint перенесён с legacy `generateContent` на Interactions API;
- тело запроса и разбор ответа приведены к текущей схеме;
- дефолтная Pro-модель исправлена на стабильное имя;
- добавлен локальный отказ до сетевого вызова для inline-запроса от 20 MB.

## Официальные источники

- [Image generation and editing](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini API models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API authentication](https://ai.google.dev/api)
- [Image input limits](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding)

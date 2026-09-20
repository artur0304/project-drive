// Локальный безопасный каркас распознавания: пока платный AI запрещён, он может
// извлечь марку и модель только из имени файла. Интерфейс всегда просит человека
// подтвердить, исправить или пропустить подсказку. Позже здесь можно заменить
// реализацию адаптером провайдера, не меняя пользовательский сценарий.
const MAKES = [
  { make: 'BMW', aliases: ['bmw'] },
  { make: 'Mercedes-Benz', aliases: ['mercedes', 'mercedes-benz', 'benz'] },
  { make: 'Audi', aliases: ['audi'] },
  { make: 'Porsche', aliases: ['porsche'] },
  { make: 'Land Rover', aliases: ['land-rover', 'range-rover', 'rangerover'] },
  { make: 'Toyota', aliases: ['toyota'] },
  { make: 'Lexus', aliases: ['lexus'] },
  { make: 'Volkswagen', aliases: ['volkswagen', 'vw'] },
];

function wordsFromFileName(fileName) {
  return String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function suggestVehicleFromFileName(fileName) {
  const words = wordsFromFileName(fileName);
  const normalized = words.join('-');
  const match = MAKES.find(({ aliases }) => aliases.some((alias) => normalized.includes(alias)));
  if (!match) return null;

  const makeWords = new Set(match.aliases.flatMap((alias) => alias.split('-')));
  const modelWords = words.filter((word) => !makeWords.has(word) && !/^(img|photo|image|dsc|copy|final|edit)$/.test(word));
  const model = modelWords.slice(0, 3).map((word) => word.toUpperCase()).join(' ');
  return { make: match.make, model, source: 'filename_hint' };
}

export function normalizeConfirmedVehicle(value) {
  const make = String(value?.make || '').trim().slice(0, 60);
  const model = String(value?.model || '').trim().slice(0, 80);
  if (!make && !model) return null;
  return { make, model };
}

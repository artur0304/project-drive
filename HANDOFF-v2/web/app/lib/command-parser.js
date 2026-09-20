const COLORS = [
  { name: 'Jet Black', hex: '#161616', words: ['black', 'чёрн', 'черн'] },
  { name: 'Alpine White', hex: '#D9D2C4', words: ['white', 'бел'] },
  { name: 'Racing Green', hex: '#3E5B44', words: ['green', 'зелён', 'зелен'] },
  { name: 'Ember Red', hex: '#9C2B2B', words: ['red', 'красн'] },
  { name: 'Deep Navy', hex: '#232C3D', words: ['blue', 'navy', 'син'] },
  { name: 'Stealth Grey', hex: '#54565C', words: ['grey', 'gray', 'сер'] },
  { name: 'Bronze', hex: '#8A5A2E', words: ['bronze', 'бронз'] },
];

const FINISHES = [
  ['Matte', ['matte', 'матов']], ['Satin', ['satin', 'сатин']],
  ['Metallic', ['metallic', 'металлик']], ['Pearl', ['pearl', 'перламутр']],
  ['Gloss', ['gloss', 'глянц']],
];

function includesAny(text, words) { return words.some((word) => text.includes(word)); }
function findColor(text) { return COLORS.find((color) => includesAny(text, color.words)); }

// Локальный предсказуемый parser: он не вызывает AI, ничего не списывает и
// возвращает только предложение, которое пользователь отдельно применяет.
export function parseVehicleCommand(input) {
  const text = String(input || '').trim().toLowerCase();
  const patch = {};
  const messages = [];
  if (!text) return { patch, messages: ['Describe the changes first.'], needsWheelSelection: false };

  const color = findColor(text);
  const finish = FINISHES.find(([, words]) => includesAny(text, words))?.[0] || 'Gloss';
  const mentionsWrap = includesAny(text, ['wrap', 'film', 'плён', 'плен', 'кузов', 'body color', 'поклей']);
  if (mentionsWrap && color) {
    patch.wrap = { color: color.name, hex: color.hex, finish };
    messages.push(`Wrap: ${color.name} · ${finish}`);
  } else if (mentionsWrap) messages.push('Wrap mentioned — choose a color manually.');

  const mentionsTint = includesAny(text, ['tint', 'тонир']);
  const removeTint = includesAny(text, ['remove tint', 'no tint', 'clear glass', 'снять тонир', 'без тонир', 'растонир']);
  if (mentionsTint && removeTint) {
    patch.tint = null; messages.push('Tint: remove');
  } else if (mentionsTint) {
    const levelMatch = text.match(/(?:^|\D)(5|20|35|50)\s*%?/);
    const level = levelMatch?.[1] || (text.includes('limo') ? '20' : text.includes('light') ? '50' : '35');
    const names = { '5': 'Black-out', '20': 'Limo', '35': 'Medium', '50': 'Light' };
    patch.tint = { name: names[level], level }; messages.push(`Tint: ${names[level]} (${level}%)`);
  }

  const mentionsWheels = includesAny(text, ['wheel', 'rim', 'диск', 'колёс', 'колес']);
  const recolorWheels = mentionsWheels && includesAny(text, ['paint', 'recolor', 'colour', 'color', 'покрас', 'цвет']);
  if (recolorWheels && color) {
    patch.wheel = { kind: 'wheel_recolor', label: `${color.name} wheels`, name: color.name, color: color.hex };
    messages.push(`Wheel color: ${color.name}`);
  }
  const needsWheelSelection = mentionsWheels && !recolorWheels;
  if (needsWheelSelection) messages.push('Wheel replacement: choose the exact model from the catalog.');
  if (!messages.length) messages.push('No supported changes found. Use wrap, tint or wheel color words.');
  return { patch, messages, needsWheelSelection };
}

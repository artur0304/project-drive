// Нормализация разрешённого товарного фида в формат Project Drive.
// Модуль намеренно не скачивает сайты и картинки. Он принимает файл, который
// поставщик официально разрешил использовать (CSV/JSON), и приводит поля к
// единой схеме. Так каталог можно обновлять повторно без ручной обработки.

function text(value, max = 250) {
  const result = String(value ?? '').trim();
  return result ? result.slice(0, max) : null;
}

function number(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\p{L}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Названия магазинов часто уже содержат характеристики. Например:
// "Mak Rapp Gloss Black R19 W9 PCD5x112 ET38 DIA66.6".
// Парсер достаёт только однозначные числовые поля; бренд, модель и цвет лучше
// брать из отдельных колонок официального фида, если они там есть.
export function parseWheelTitle(title) {
  const value = String(title || '').replace(/\s+/g, ' ').trim();
  const diameter = number(value.match(/\bR(\d{2})\b/i)?.[1]);
  const width = number(value.match(/\bW(\d+(?:[.,]\d+)?)\b/i)?.[1]);
  const boltPattern = text(value.match(/\bPCD\s*([0-9]+x[0-9.]+)/i)?.[1], 40);
  const offset = number(value.match(/\bET\s*(-?\d+(?:[.,]\d+)?)/i)?.[1]);
  const centerBore = number(value.match(/\bDIA\s*(\d+(?:[.,]\d+)?)/i)?.[1]);
  return { diameter, width, boltPattern, offset, centerBore };
}

export function normalizeFeedRow(row, source) {
  const title = text(row.title || row.name, 240);
  const parsed = parseWheelTitle(title);
  const brand = text(row.brand, 80);
  const model = text(row.model, 120);
  const diameter = number(row.diameter) ?? parsed.diameter;
  const externalId = text(row.externalId || row.external_id || row.id || row.sku, 120);
  if (!brand || !model || !diameter || diameter < 12 || diameter > 30 || !externalId) {
    throw new Error(`Строка фида неполная: нужны externalId, brand, model и diameter 12–30 (${title || 'без названия'})`);
  }

  const color = text(row.color, 80) || 'Unknown';
  const finish = text(row.finish, 80) || 'Unknown';
  const sourceUrl = text(row.sourceUrl || row.source_url || row.url, 500);
  const imageUrls = [row.imageFront || row.image_front, row.imageThreeQuarter || row.image_three_quarter]
    .map((url) => text(url, 1000));

  return {
    brand,
    brandSlug: slugify(row.brandSlug || brand),
    isOem: row.isOem === true || ['1', 'true', 'yes'].includes(String(row.isOem || '').toLowerCase()),
    model,
    modelSlug: slugify(row.modelSlug || model),
    source: {
      id: source.id,
      externalId,
      sourceUrl,
      category: text(row.category, 80) || 'wheels',
      wheelType: text(row.wheelType || row.wheel_type || row.type, 40) || 'unknown',
      country: text(row.country || row.country_of_origin, 80),
    },
    variant: {
      sizeLabel: text(row.sizeLabel || row.size_label, 20) || `R${diameter}`,
      diameter,
      width: number(row.width) ?? parsed.width,
      color,
      finish,
      boltPattern: text(row.boltPattern || row.bolt_pattern, 40) || parsed.boltPattern,
      offset: number(row.offset) ?? parsed.offset,
      centerBore: number(row.centerBore || row.center_bore) ?? parsed.centerBore,
      sku: text(row.sku, 120),
      stockStatus: text(row.stockStatus || row.stock_status || row.availability, 40),
      priceCents: number(row.priceCents || row.price_cents),
      currency: text(row.currency, 8) || 'UAH',
      supplier: source.name,
      affiliateLink: sourceUrl,
      popularity: number(row.popularity) || 0,
      rightsSource: source.name,
      rightsBasis: source.rightsBasis,
    },
    references: {
      front: imageUrls[0],
      threeQuarter: imageUrls[1],
    },
  };
}

export function normalizeAuthorizedFeed(rows, source) {
  if (source?.usageStatus !== 'approved' || !source?.rightsBasis) {
    throw new Error(`Источник ${source?.name || 'неизвестен'} не разрешён: нужен статус approved и письменное основание прав`);
  }
  if (!Array.isArray(rows) || !rows.length) throw new Error('Фид пуст');
  return rows.map((row) => normalizeFeedRow(row, source));
}

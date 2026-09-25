'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import { getToken } from '../lib/storage';

const ROW_HEIGHT = 238;
const VIEWPORT_HEIGHT = 470;
const PAGE_SIZE = 48;

function WheelCard({ wheel, selected, favorite, onSelect, onFavorite }) {
  return <article className={selected ? 'catalogWheel active' : 'catalogWheel'}>
    <button className="favoriteButton" type="button" aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={favorite} onClick={(event) => { event.stopPropagation(); onFavorite(wheel); }}>{favorite ? '♥' : '♡'}</button>
    <button className="wheelMain" type="button" onClick={() => onSelect(wheel)}>
      {/* Собственные иллюстрации каталога; внешние OEM-фото здесь не используются. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={wheel.image_url} alt={`${wheel.brand} ${wheel.model} ${wheel.color}`} loading="lazy" />
      <span className="wheelBrand">{wheel.brand}</span>
      <strong>{wheel.model}</strong>
      <small>{wheel.size_label} · {wheel.color} · {wheel.finish}</small>
    </button>
    <div className="wheelCardFoot">
      {wheel.source_url
        ? <a className="wheelSource" href={wheel.source_url} target="_blank" rel="noreferrer" title={wheel.image_rights_basis || 'Image source'}>Photo source</a>
        : <span className="wheelCardHint">Included in one generation</span>}
      <button type="button" onClick={() => onSelect(wheel)}>Try on</button>
    </div>
  </article>;
}

export default function WheelCatalog({ draft, onSelect, customReference, onCustomReference, onUseCustomReference }) {
  const viewportRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('popular');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ kind: '', diameter: '', finish: '', color: '', brand: '', style: '' });
  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState({ brands: [], diameters: [], finishes: [], colors: [], styles: [] });
  const [nextCursor, setNextCursor] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customPreview, setCustomPreview] = useState('');
  const token = getToken();

  useEffect(() => {
    if (!customReference?.file) { setCustomPreview(''); return undefined; }
    const url = URL.createObjectURL(customReference.file);
    setCustomPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [customReference]);

  async function chooseCustomFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type)) {
      setError('Use a JPG, PNG, WEBP or HEIC wheel photo.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Wheel photo must be smaller than 20 MB.');
      return;
    }
    setError('');
    await onCustomReference(file);
  }

  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true); setError(''); setScrollTop(0);
      try {
        let data;
        if (mode === 'favorites') data = await apiRequest('/api/wheels/favorites?limit=48', { token });
        else if (mode === 'recent') data = await apiRequest('/api/wheels/recent?limit=24', { token });
        else {
          const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
          if (query.trim()) params.set('q', query.trim());
          for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
          const result = await apiRequest(`/api/wheels?${params}`, { token: '' });
          data = result.items; setNextCursor(result.nextCursor); setFacets(result.facets);
        }
        setItems(data); if (mode !== 'popular') setNextCursor(null);
        if (mode === 'favorites') setFavorites(new Set(data.map((wheel) => wheel.id)));
      } catch (cause) {
        setItems([]); setError(cause.status === 401 ? 'Sign in to use personal wheel lists.' : cause.message);
      } finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(timer);
  }, [mode, query, filterKey, token]);

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), cursor: nextCursor });
      if (query.trim()) params.set('q', query.trim());
      for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
      const result = await apiRequest(`/api/wheels?${params}`, { token: '' });
      setItems((current) => [...current, ...result.items]); setNextCursor(result.nextCursor);
    } catch (cause) { setError(cause.message); } finally { setLoading(false); }
  }

  async function toggleFavorite(wheel) {
    if (!token) { setError('Sign in to save favorites.'); return; }
    try {
      const result = await apiRequest(`/api/wheels/${encodeURIComponent(wheel.id)}/favorite`, { method: 'POST', token });
      setFavorites((current) => {
        const next = new Set(current); result.favorite ? next.add(wheel.id) : next.delete(wheel.id); return next;
      });
      if (!result.favorite && mode === 'favorites') setItems((current) => current.filter((item) => item.id !== wheel.id));
    } catch (cause) { setError(cause.message); }
  }

  function choose(wheel) {
    onSelect(`${wheel.brand} ${wheel.model}`, `${wheel.size_label} · ${wheel.finish}`, wheel.color, wheel);
    if (token) apiRequest(`/api/wheels/${encodeURIComponent(wheel.id)}/view`, { method: 'POST', token }).catch(() => {});
  }

  // Виртуализируем строки, а не отдельные карточки: DOM остаётся небольшим даже
  // после загрузки тысяч вариантов через cursor-пагинацию.
  const rows = useMemo(() => Array.from({ length: Math.ceil(items.length / 2) }, (_, index) => items.slice(index * 2, index * 2 + 2)), [items]);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const end = Math.min(rows.length, Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + 2);

  const chips = [
    ['kind', 'OEM', 'oem'], ['kind', 'Aftermarket', 'aftermarket'],
    ...facets.diameters.map((value) => ['diameter', `R${value}`, String(value)]),
    ...facets.finishes.slice(0, 4).map((value) => ['finish', value, value]),
  ];

  return <section className="wheelCatalog" aria-label="Wheel catalog">
    <article className={draft.wheel?.customReference ? 'customWheelUpload active' : 'customWheelUpload'}>
      <div className="customWheelVisual">
        {customPreview
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={customPreview} alt="Your wheel reference" />
          : <span aria-hidden="true">＋</span>}
      </div>
      <div className="customWheelCopy">
        <span>YOUR REFERENCE</span>
        <strong>{customReference?.name || 'Upload any wheel you like'}</strong>
        <small>Use a sharp, front-facing photo. We’ll match the spoke design and finish.</small>
      </div>
      <button type="button" onClick={() => customReference && !draft.wheel?.customReference ? onUseCustomReference() : fileInputRef.current?.click()}>
        {!customReference ? 'Choose photo' : draft.wheel?.customReference ? 'Replace' : 'Use photo'}
      </button>
      <input ref={fileInputRef} className="visuallyHiddenFile" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={chooseCustomFile} />
    </article>
    <div className="catalogModes">{[['popular', 'Popular'], ['favorites', 'Favorites'], ['recent', 'Recent']].map(([value, label]) => <button key={value} type="button" className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{label}</button>)}</div>
    {mode === 'popular' && <>
      <label className="wheelSearch"><span aria-hidden="true">⌕</span><input aria-label="Search wheels" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search brand or model" /></label>
      <div className="filterChips">{chips.map(([key, label, value]) => <button key={`${key}-${value}`} type="button" className={filters[key] === value ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, [key]: current[key] === value ? '' : value }))}>{label}</button>)}</div>
      <div className="catalogSelects">
        <label>Brand<select value={filters.brand} onChange={(event) => setFilters((current) => ({ ...current, brand: event.target.value }))}><option value="">All brands</option>{facets.brands.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}</select></label>
        <label>Color<select value={filters.color} onChange={(event) => setFilters((current) => ({ ...current, color: event.target.value }))}><option value="">All colors</option>{facets.colors.map((color) => <option key={color} value={color}>{color}</option>)}</select></label>
        <label>Spoke style<select value={filters.style} onChange={(event) => setFilters((current) => ({ ...current, style: event.target.value }))}><option value="">All styles</option>{facets.styles.map((style) => <option key={style} value={style}>{style.replaceAll('_', ' ')}</option>)}</select></label>
      </div>
    </>}
    {error && <p className="catalogMessage error">{error}</p>}
    {!loading && !items.length && <p className="catalogMessage">No wheels found.</p>}
    <div ref={viewportRef} className="virtualWheelViewport" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      <div className="virtualWheelSpace" style={{ height: rows.length * ROW_HEIGHT }}>
        {rows.slice(start, end).map((row, offset) => <div className="virtualWheelRow" key={row[0]?.id} style={{ transform: `translateY(${(start + offset) * ROW_HEIGHT}px)` }}>
          {row.map((wheel) => <WheelCard key={wheel.id} wheel={wheel} selected={draft.wheel?.variantId === wheel.id} favorite={favorites.has(wheel.id)} onSelect={choose} onFavorite={toggleFavorite} />)}
        </div>)}
      </div>
    </div>
    {nextCursor && <button className="loadMoreWheels" type="button" disabled={loading} onClick={loadMore}>{loading ? 'Loading…' : 'Load more'}</button>}
  </section>;
}

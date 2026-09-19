'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPendingPhoto } from '../lib/pending-photo';
import AuthGate from './auth-gate';
import './configurator.css';

const PRICE = { wrap: 25, tint: 10, wheel_replace: 20, wheel_recolor: 10 };
const DEMO_TARGET_BALANCE = 103; // Локальная цель пополнения; это не деньги и не Google-баланс.

const COLORS = [
  ['Jet Black', '#161616'], ['Alpine White', '#D9D2C4'],
  ['Racing Green', '#3E5B44'], ['Ember Red', '#9C2B2B'],
  ['Deep Navy', '#232C3D'], ['Stealth Grey', '#54565C'],
  ['Bronze', '#8A5A2E'], ['Champagne', '#C7B389'],
  ['Slate Blue', '#3A4B5C'], ['Graphite', '#3A3C40'],
  ['Copper', '#A9662F'], ['Titanium', '#7A7D82'],
];
const FINISHES = ['Gloss', 'Satin', 'Matte', 'Metallic', 'Pearl'];
const TINTS = [
  ['No tint', 'Clear glass', '#2A333C', null],
  ['Light', '~50% light', '#222A31', '50'],
  ['Medium', '~35% light', '#1B2228', '35'],
  ['Limo', '~20% light', '#141A1F', '20'],
  ['Black-out', '~5% light', '#0C1013', '5'],
];
const WHEELS = [
  ['BMW 437M', 'R20 · Ferric', '#9A9C9F'],
  ['Vossen HF-3', 'R21 · Black', '#161616'],
  ['BBS CH-R', 'R19 · Titanium', '#8B8D92'],
  ['Rotiform TMB', 'R19 · Bronze', '#8A5A2E'],
];
const WHEEL_COLORS = [
  ['Silver', '#9A9C9F'], ['Black', '#161616'], ['Bronze', '#8A5A2E'],
  ['Gunmetal', '#42454A'], ['Gold', '#C7A24E'], ['White', '#D9D2C4'],
];

const INITIAL_DRAFT = {
  wrap: { color: 'Jet Black', hex: '#161616', finish: 'Gloss' },
  tint: null,
  wheel: null,
};

export default function ConfiguratorPage() {
  const router = useRouter();
  const stageRef = useRef(null);
  const [activeTab, setActiveTab] = useState('wrap');
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoName, setPhotoName] = useState('Your car');
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(true);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;

    async function loadPhotoAndDraft() {
      const pending = await getPendingPhoto();
      if (cancelled) return;
      if (pending?.file) {
        setPendingPhoto(pending);
        objectUrl = URL.createObjectURL(pending.file);
        setPhotoUrl(objectUrl);
        setPhotoName(pending.name || 'Your car');
      }

      const savedDraft = localStorage.getItem('project-drive-draft');
      if (savedDraft) {
        try { setDraft(JSON.parse(savedDraft)); } catch { /* Повреждённый черновик просто игнорируем. */ }
      }
      setIsDraftLoaded(true);
      setIsLoadingPhoto(false);
    }

    loadPhotoAndDraft().catch(() => {
      setIsDraftLoaded(true);
      setIsLoadingPhoto(false);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  useEffect(() => {
    // На первом рендере draft ещё не прочитан из localStorage. Ждём загрузку,
    // иначе начальные значения успеют затереть сохранённый выбор пользователя.
    if (!isDraftLoaded) return;
    localStorage.setItem('project-drive-draft', JSON.stringify(draft));
  }, [draft, isDraftLoaded]);

  useEffect(() => {
    const token = sessionStorage.getItem('project-drive-token');
    if (!token) return;
    apiRequest('/api/wallet', { token })
      .then((wallet) => setWalletBalance(wallet.balance))
      .catch(() => setWalletBalance(null));
  }, []);

  const operations = useMemo(() => {
    const result = [];
    if (draft.wrap) result.push({ key: 'wrap', label: `${draft.wrap.color} · ${draft.wrap.finish}`, cost: PRICE.wrap });
    if (draft.tint) result.push({ key: 'tint', label: `${draft.tint.name} tint`, cost: PRICE.tint });
    if (draft.wheel) result.push({ key: 'wheel', label: draft.wheel.label, cost: PRICE[draft.wheel.kind] });
    return result;
  }, [draft]);

  const total = operations.reduce((sum, operation) => sum + operation.cost, 0);

  function changeWrapColor(color, hex) {
    setDraft((current) => ({ ...current, wrap: { color, hex, finish: current.wrap?.finish || 'Gloss' } }));
  }
  function changeFinish(finish) {
    setDraft((current) => ({ ...current, wrap: { ...(current.wrap || INITIAL_DRAFT.wrap), finish } }));
  }
  function selectTint(name, level) {
    setDraft((current) => ({ ...current, tint: level ? { name, level } : null }));
  }
  function selectWheel(name, detail, color) {
    setDraft((current) => ({ ...current, wheel: { kind: 'wheel_replace', label: name, name, detail, color } }));
  }
  function selectWheelColor(name, color) {
    setDraft((current) => ({ ...current, wheel: { kind: 'wheel_recolor', label: `${name} wheels`, name, color } }));
  }
  async function toggleFullscreen() {
    if (!document.fullscreenElement) await stageRef.current?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  async function apiRequest(path, { method = 'GET', token, body, headers = {} } = {}) {
    const response = await fetch(path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body == null ? undefined : body instanceof Blob ? body : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function getOrCreateProject(token) {
    const savedId = sessionStorage.getItem('project-drive-project-id');
    if (savedId) {
      const projects = await apiRequest('/api/projects', { token });
      if (projects.some((project) => project.id === savedId)) return savedId;
      sessionStorage.removeItem('project-drive-project-id');
      sessionStorage.removeItem('project-drive-uploaded-project-id');
    }

    const project = await apiRequest('/api/projects', {
      method: 'POST', token,
      body: { name: photoName.replace(/\.[^.]+$/, '') || 'My car' },
    });
    sessionStorage.setItem('project-drive-project-id', project.id);
    return project.id;
  }

  async function uploadPhotoOnce(token, projectId) {
    if (sessionStorage.getItem('project-drive-uploaded-project-id') === projectId) return;
    await apiRequest(`/api/upload?projectId=${encodeURIComponent(projectId)}`, {
      method: 'POST', token, body: pendingPhoto.file,
      headers: { 'Content-Type': pendingPhoto.type || 'image/jpeg' },
    });
    sessionStorage.setItem('project-drive-uploaded-project-id', projectId);
  }

  async function ensureLocalDemoCredits(token) {
    const wallet = await apiRequest('/api/wallet', { token });
    if (wallet.balance >= total) return;

    // Этот маршрут существует только в учебном локальном бэкенде. Он начисляет
    // ненастоящие кредиты для проверки цепочки и не связан с Google или деньгами.
    if (process.env.NODE_ENV !== 'development') throw new Error('Not enough credits');
    await apiRequest('/api/wallet/add', {
      method: 'POST', token,
      body: { amount: DEMO_TARGET_BALANCE - wallet.balance, reason: 'local_demo_balance' },
    });
  }

  function operationsForApi() {
    const result = [];
    if (draft.wrap) result.push({ kind: 'wrap', color: draft.wrap.color, finish: draft.wrap.finish });
    if (draft.tint) result.push({ kind: 'tint', level: draft.tint.level, name: draft.tint.name });
    if (draft.wheel) result.push({ kind: draft.wheel.kind, name: draft.wheel.name, color: draft.wheel.color });
    return result;
  }

  async function runMockGeneration(token) {
    setIsGenerating(true);
    setShowAuthGate(true);
    setAuthError('');
    try {
      const projectId = await getOrCreateProject(token);
      await uploadPhotoOnce(token, projectId);
      await ensureLocalDemoCredits(token);
      const result = await apiRequest('/api/generate', {
        method: 'POST', token,
        body: { projectId, operations: operationsForApi() },
      });
      sessionStorage.setItem('project-drive-last-result', JSON.stringify({
        ...result, projectId, draft, sourceUrl: result.outputUrl,
        createdAt: new Date().toISOString(),
      }));
      router.push('/result');
    } catch (error) {
      setAuthError(error.message || 'Could not prepare the result.');
      setIsGenerating(false);
    }
  }

  async function requestGeneration() {
    const token = sessionStorage.getItem('project-drive-token');
    if (!token) {
      setAuthError('');
      setShowAuthGate(true);
      return;
    }
    try {
      await apiRequest('/api/auth/me', { token });
      await runMockGeneration(token);
    } catch {
      sessionStorage.removeItem('project-drive-token');
      setAuthError('Your session expired. Please sign in again.');
      setShowAuthGate(true);
    }
  }

  async function authenticateAndGenerate({ mode, name, email, password }) {
    setIsGenerating(true);
    setAuthError('');
    try {
      const auth = await apiRequest(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: { email, password, ...(mode === 'register' ? { name } : {}) },
      });
      sessionStorage.setItem('project-drive-token', auth.token);
      await runMockGeneration(auth.token);
    } catch (error) {
      setAuthError(error.message || 'Could not sign in.');
      setIsGenerating(false);
    }
  }

  if (isLoadingPhoto) return <main className="configLoading">Loading your car…</main>;
  if (!photoUrl) {
    return <main className="configEmpty"><h1>No car photo yet</h1><p>Choose a photo first, then return to the configurator.</p><button type="button" onClick={() => router.push('/upload')}>Upload your car</button></main>;
  }

  return (
    <main className="configApp">
      <section className="configStage" ref={stageRef}>
        <div className="stageTop">
          <div className="crumb"><strong>{photoName}</strong> · original photo</div>
          <div className="stageTools">
            <button className="iconButton" type="button" title="Reset draft" onClick={() => setDraft(INITIAL_DRAFT)}><UndoIcon /></button>
            <button className="iconButton" type="button" title="Fullscreen" onClick={toggleFullscreen}><FullscreenIcon /></button>
          </div>
        </div>
        <div className="photoStage">
          {/* Выбор справа меняет только draft: фото остаётся исходным до Generate. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Your car, unchanged while editing the draft" />
        </div>
        <div className="stageDots" aria-hidden="true"><span className="on" /><span /><span /></div>
      </section>

      <aside className="configPanel">
        <header className="panelTop">
          <div className="brandLine">
            <a className="configBrand" href="/"><CarMark />Project Drive</a>
            <div className="configAccountLinks"><a href="/garage">Garage</a><a className="configCredits" href="/credits"><span />{walletBalance == null ? 'Guest' : walletBalance}</a></div>
          </div>
          <div className="configTabs" role="tablist" aria-label="Customization type">
            {[['wrap', 'Wrap'], ['tint', 'Tint'], ['wheels', 'Wheels'], ['wcolor', 'Wheel color']].map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={activeTab === value} className={activeTab === value ? 'active' : ''} onClick={() => setActiveTab(value)}>{label}</button>
            ))}
          </div>
        </header>

        <div className="panelBody">
          {activeTab === 'wrap' && <section aria-label="Wrap settings">
            <p className="fieldLabel">Color</p>
            <div className="swatchGrid">{COLORS.map(([name, hex]) => <button key={name} type="button" className={draft.wrap?.color === name ? 'swatch active' : 'swatch'} style={{ background: hex }} title={name} aria-label={name} onClick={() => changeWrapColor(name, hex)} />)}</div>
            <p className="fieldLabel spaced">Finish</p>
            <div className="finishGrid">{FINISHES.map((finish) => <button key={finish} type="button" className={draft.wrap?.finish === finish ? 'active' : ''} onClick={() => changeFinish(finish)}>{finish}</button>)}</div>
          </section>}

          {activeTab === 'tint' && <section aria-label="Tint settings">
            <p className="fieldLabel">Window tint</p>
            {TINTS.map(([name, detail, color, level]) => {
              const selected = level ? draft.tint?.level === level : !draft.tint;
              return <button key={name} type="button" className={selected ? 'tintOption active' : 'tintOption'} onClick={() => selectTint(name, level)}><span className="tintChip" style={{ background: color }} /><span><strong>{name}</strong><small>{detail}</small></span></button>;
            })}
          </section>}

          {activeTab === 'wheels' && <section aria-label="Wheel replacement settings">
            <p className="fieldLabel">Popular wheels</p>
            <div className="wheelGrid">{WHEELS.map(([name, detail, color]) => <button key={name} type="button" className={draft.wheel?.kind === 'wheel_replace' && draft.wheel.name === name ? 'wheelCard active' : 'wheelCard'} onClick={() => selectWheel(name, detail, color)}><WheelIcon color={color} /><strong>{name}</strong><small>{detail}</small></button>)}</div>
          </section>}

          {activeTab === 'wcolor' && <section aria-label="Wheel color settings">
            <p className="fieldLabel">Recolor current wheels</p>
            <div className="swatchGrid">{WHEEL_COLORS.map(([name, color]) => <button key={name} type="button" className={draft.wheel?.kind === 'wheel_recolor' && draft.wheel.name === name ? 'swatch active' : 'swatch'} style={{ background: color }} title={name} aria-label={name} onClick={() => selectWheelColor(name, color)} />)}</div>
          </section>}
        </div>

        <footer className="configFoot">
          <p className="generateHint"><InfoIcon />You&apos;ll see it on your car after you press Generate</p>
          <div className="operationList">{operations.length ? operations.map((operation) => <div key={operation.key}><span>{operation.label}</span><strong>{operation.cost} cr</strong></div>) : <span className="noChanges">No changes selected</span>}</div>
          <div className="generateRow"><div className="total">Total <strong>{total}</strong> credits</div><button className="generateButton" type="button" disabled={!operations.length || isGenerating} onClick={requestGeneration}>{isGenerating ? 'Generating…' : 'Generate'}</button></div>
        </footer>
      </aside>

      {showAuthGate && <AuthGate busy={isGenerating} error={authError} onClose={() => setShowAuthGate(false)} onSubmit={authenticateAndGenerate} />}
    </main>
  );
}

function CarMark() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 15l2.4-6C6 7.6 7.2 7 8.6 7h6.8c1.4 0 2.6.6 3.2 2l2.4 6" stroke="currentColor" strokeWidth="1.5"/><circle cx="7" cy="15.5" r="2.2" stroke="var(--accent)" strokeWidth="1.5"/><circle cx="17" cy="15.5" r="2.2" stroke="var(--accent)" strokeWidth="1.5"/></svg>; }
function UndoIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 015 5v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function FullscreenIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function InfoIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 8v5M12 16v.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function WheelIcon({ color }) { return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#0F1113" stroke="#000" strokeWidth="2"/><circle cx="50" cy="50" r="30" fill={color}/><g stroke="#31343A" strokeWidth="3"><path d="M50 22v56M22 50h56M30 30l40 40M70 30L30 70"/></g><circle cx="50" cy="50" r="8" fill="#0C0E13"/></svg>; }

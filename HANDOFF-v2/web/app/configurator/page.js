'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPendingPhoto } from '../lib/pending-photo';
import { apiRequest } from '../lib/api';
import { costFromPricing, operationsFromDraft } from '../lib/configuration';
import {
  clearProjectId, clearToken, clearUploadedProjectId, getDraft, getProjectId,
  getToken, getUploadedProjectId, setDraft as saveDraft, setProjectId,
  setToken, setUploadedProjectId,
} from '../lib/storage';
import { CarMark, FullscreenIcon, UndoIcon } from '../components/configurator-icons';
import { TintTab, WheelColorTab, WheelsTab, WrapTab } from '../components/configurator-tabs';
import GenerateFooter from '../components/generate-footer';
import AuthGate from './auth-gate';
import './configurator.css';

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
  const [pricing, setPricing] = useState(null);
  const [generationError, setGenerationError] = useState('');

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

      const savedDraft = getDraft();
      if (savedDraft) setDraft(savedDraft);
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
    saveDraft(draft);
  }, [draft, isDraftLoaded]);

  useEffect(() => {
    apiRequest('/api/pricing', { token: '' })
      .then((data) => setPricing(data.operations))
      .catch(() => setPricing(null));

    const token = getToken();
    if (!token) return;
    apiRequest('/api/wallet', { token })
      .then((wallet) => setWalletBalance(wallet.balance))
      .catch(() => setWalletBalance(null));
  }, []);

  const operations = useMemo(() => {
    const result = [];
    if (draft.wrap) result.push({ key: 'wrap', label: `${draft.wrap.color} · ${draft.wrap.finish}`, cost: pricing?.wrap ?? 0 });
    if (draft.tint) result.push({ key: 'tint', label: `${draft.tint.name} tint`, cost: pricing?.tint ?? 0 });
    if (draft.wheel) result.push({ key: 'wheel', label: draft.wheel.label, cost: pricing?.[draft.wheel.kind] ?? 0 });
    return result;
  }, [draft, pricing]);

  const apiOperations = useMemo(() => operationsFromDraft(draft), [draft]);
  const total = costFromPricing(apiOperations, pricing);

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

  async function getOrCreateProject(token) {
    const savedId = getProjectId();
    if (savedId) {
      const projects = await apiRequest('/api/projects', { token });
      if (projects.some((project) => project.id === savedId)) return savedId;
      clearProjectId();
      clearUploadedProjectId();
    }

    const project = await apiRequest('/api/projects', {
      method: 'POST', token,
      body: { name: photoName.replace(/\.[^.]+$/, '') || 'My car' },
    });
    setProjectId(project.id);
    return project.id;
  }

  async function uploadPhotoOnce(token, projectId) {
    if (getUploadedProjectId() === projectId) return;
    await apiRequest(`/api/upload?projectId=${encodeURIComponent(projectId)}`, {
      method: 'POST', token, body: pendingPhoto.file,
      headers: { 'Content-Type': pendingPhoto.type || 'image/jpeg' },
    });
    setUploadedProjectId(projectId);
  }

  async function runMockGeneration(token) {
    setIsGenerating(true);
    setShowAuthGate(true);
    setAuthError('');
    setGenerationError('');
    try {
      const projectId = await getOrCreateProject(token);
      await uploadPhotoOnce(token, projectId);
      const result = await apiRequest('/api/generate', {
        method: 'POST', token,
        body: { projectId, operations: apiOperations },
      });
      router.push(`/result/${encodeURIComponent(result.versionId)}`);
    } catch (error) {
      setIsGenerating(false);
      if (error.status === 401) {
        clearToken();
        setAuthError('Your session expired. Please sign in again.');
      } else {
        setShowAuthGate(false);
        setGenerationError(error.message || 'Could not prepare the result.');
      }
    }
  }

  async function requestGeneration() {
    const token = getToken();
    if (!token) {
      setAuthError('');
      setShowAuthGate(true);
      return;
    }
    try {
      await apiRequest('/api/auth/me', { token });
      await runMockGeneration(token);
    } catch (error) {
      if (error.status === 401) {
        clearToken();
        setAuthError('Your session expired. Please sign in again.');
        setShowAuthGate(true);
      } else {
        setGenerationError(error.message || 'Could not reach the local backend.');
      }
    }
  }

  async function authenticateAndGenerate({ mode, name, email, password }) {
    setIsGenerating(true);
    setAuthError('');
    try {
      const auth = await apiRequest(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: { email, password, ...(mode === 'register' ? { name } : {}) },
      });
      setToken(auth.token);
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
          {activeTab === 'wrap' && <WrapTab draft={draft} onColor={changeWrapColor} onFinish={changeFinish} />}
          {activeTab === 'tint' && <TintTab draft={draft} onSelect={selectTint} />}
          {activeTab === 'wheels' && <WheelsTab draft={draft} onSelect={selectWheel} />}
          {activeTab === 'wcolor' && <WheelColorTab draft={draft} onSelect={selectWheelColor} />}
        </div>

        <GenerateFooter operations={operations} total={total} pricingReady={Boolean(pricing)} isGenerating={isGenerating} error={generationError} onGenerate={requestGeneration} />
      </aside>

      {showAuthGate && <AuthGate busy={isGenerating} error={authError} onClose={() => setShowAuthGate(false)} onSubmit={authenticateAndGenerate} />}
    </main>
  );
}

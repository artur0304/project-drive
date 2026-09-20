'use client'

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { draftFromOperations } from '../lib/configuration';
import {
  clearToken, getToken, setDraft, setProjectId, setUploadedProjectId,
} from '../lib/storage';
import { savePendingPhoto } from '../lib/pending-photo';
import './garage.css';
import './rename.css';

function draftFromConfig(configJson) {
  let operations = [];
  try { operations = JSON.parse(configJson || '[]'); } catch { return {}; }
  return draftFromOperations(operations);
}

function readableDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(value));
}

export default function GaragePage() {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadGarage() {
      const token = getToken();
      if (!token) {
        setStatus('signed-out');
        return;
      }

      try {
        const [me, walletData, projectRows] = await Promise.all([
          apiRequest('/api/auth/me', { token }),
          apiRequest('/api/wallet', { token }),
          apiRequest('/api/projects', { token }),
        ]);
        const completeProjects = await Promise.all(projectRows.map(async (project) => ({
          ...project,
          versions: await apiRequest(`/api/versions?projectId=${encodeURIComponent(project.id)}`, { token }),
        })));
        if (cancelled) return;
        setUser(me);
        setWallet(walletData);
        setProjects(completeProjects);
        setStatus('ready');
      } catch (requestError) {
        if (cancelled) return;
        clearToken();
        setError(requestError.message || 'Could not load your garage.');
        setStatus('signed-out');
      }
    }

    loadGarage();
    return () => { cancelled = true; };
  }, []);

  const versionCount = useMemo(
    () => projects.reduce((sum, project) => sum + project.versions.length, 0),
    [projects],
  );

  async function prepareProject(project, draft) {
    setOpeningId(project.id);
    setError('');
    try {
      // Возвращаем сохранённое исходное фото в IndexedDB. Благодаря этому
      // конфигуратор умеет открыть проект и после перезагрузки страницы.
      const response = await fetch(project.source_url);
      if (!response.ok) throw new Error('The source photo is unavailable.');
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `${project.name}.${extension}`, { type: blob.type });
      await savePendingPhoto(file);
      setProjectId(project.id);
      setUploadedProjectId(project.id);
      if (draft) setDraft(draft);
      router.push('/configurator');
    } catch (openError) {
      setError(openError.message || 'Could not open this project.');
      setOpeningId('');
    }
  }

  function openVersion(version) {
    router.push(`/result/${encodeURIComponent(version.id)}`);
  }

  function beginRename(project) {
    setEditingId(project.id);
    setEditingName(project.name);
    setError('');
  }

  async function saveProjectName(projectId) {
    const token = getToken();
    const cleanName = editingName.trim();
    if (!token || !cleanName) return;
    try {
      const updated = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}`, {
        token,
        method: 'PATCH', body: { name: cleanName },
      });
      setProjects((current) => current.map((project) => project.id === projectId ? { ...project, name: updated.name } : project));
      setEditingId('');
    } catch (renameError) {
      setError(renameError.message || 'Could not rename this car.');
    }
  }

  if (status === 'loading') {
    return <main className="garageState"><span className="garageLoader" /><p>Opening your garage…</p></main>;
  }

  if (status === 'signed-out') {
    return (
      <main className="garageState">
        <p className="garageKicker">YOUR GARAGE</p>
        <h1>Sign in after choosing a car</h1>
        <p>{error || 'Your local projects appear here after the first mock generation.'}</p>
        <button type="button" onClick={() => router.push('/upload')}>Upload your car</button>
      </main>
    );
  }

  return (
    <main className="garagePage">
      <header className="garageNav">
        <a href="/" className="garageBrand"><span>PD</span>Project Drive</a>
        <nav aria-label="Main navigation">
          <a className="active" href="/garage">Garage</a>
          <a href="/credits">Credits</a>
          <a href="/account">Account</a>
          <span>{wallet?.balance ?? 0} demo credits</span>
        </nav>
      </header>

      <section className="garageHero">
        <div>
          <p className="garageKicker">YOUR GARAGE</p>
          <h1>Every build, ready for the next idea.</h1>
          <p>{projects.length} {projects.length === 1 ? 'car' : 'cars'} · {versionCount} saved {versionCount === 1 ? 'version' : 'versions'}</p>
        </div>
        <button type="button" onClick={() => router.push('/upload')}><b>+</b> Upload a car</button>
      </section>

      {error && <p className="garageError" role="alert">{error}</p>}

      {projects.length === 0 ? (
        <section className="garageEmpty">
          <div>01</div><h2>Your first car starts with one photo.</h2>
          <p>Upload a clear exterior photo, choose a look and save the local mock result here.</p>
          <button type="button" onClick={() => router.push('/upload')}>Choose photo</button>
        </section>
      ) : projects.map((project, projectIndex) => {
        const latestDraft = draftFromConfig(project.versions[0]?.config_json);
        return (
          <section className="garageProject" key={project.id}>
            <header>
              <div className="projectNumber">{String(projectIndex + 1).padStart(2, '0')}</div>
              <div>
                <p>CAR PROJECT</p>
                {editingId === project.id ? (
                  <form className="renameForm" onSubmit={(event) => { event.preventDefault(); saveProjectName(project.id); }}>
                    <input aria-label="Car project name" maxLength="80" value={editingName} onChange={(event) => setEditingName(event.target.value)} autoFocus />
                    <button type="submit">Save</button><button type="button" onClick={() => setEditingId('')}>Cancel</button>
                  </form>
                ) : <h2>{project.name}</h2>}
                <span>Created {readableDate(project.created_at)} · {project.versions.length} saved versions</span>
              </div>
              <div className="projectActions"><button className="renameButton" type="button" onClick={() => beginRename(project)}>Rename</button><button type="button" disabled={openingId === project.id} onClick={() => prepareProject(project, latestDraft)}>{openingId === project.id ? 'Opening…' : 'New variation'}</button></div>
            </header>

            <div className="versionGrid">
              <article className="versionCard originalCard">
                <button type="button" onClick={() => prepareProject(project, latestDraft)} disabled={openingId === project.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.source_url} alt={`Original ${project.name}`} />
                  <span className="imageBadge">ORIGINAL</span>
                </button>
                <div><strong>Source photo</strong><span>Ready to customize</span></div>
              </article>

              {project.versions.map((version, versionIndex) => {
                const draft = draftFromConfig(version.config_json);
                const title = [draft.wrap?.color, draft.wrap?.finish].filter(Boolean).join(' · ') || `Version ${project.versions.length - versionIndex}`;
                const details = [draft.tint?.name && `${draft.tint.name} tint`, draft.wheel?.label].filter(Boolean).join(' · ');
                return (
                  <article className="versionCard" key={version.id}>
                    <button type="button" onClick={() => openVersion(version)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={version.output_url || project.source_url} alt={`${project.name}: ${title}`} />
                      <span className="imageBadge savedBadge">SAVED</span>
                    </button>
                    <div><strong>{title}</strong><span>{details || readableDate(version.created_at)}</span></div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}

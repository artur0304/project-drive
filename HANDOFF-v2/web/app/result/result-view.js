'use client'

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { draftFromOperations } from '../lib/configuration';
import { getToken, setDraft, setProjectId, setUploadedProjectId } from '../lib/storage';
import { savePendingPhoto } from '../lib/pending-photo';
import './result.css';

export default function ResultView({ versionId }) {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [compare, setCompare] = useState(50);
  const [walletBalance, setWalletBalance] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('artifacts');
  const [reportNote, setReportNote] = useState('');
  const [reportStatus, setReportStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoadError('Sign in to open this saved result.');
      setStatus('error');
      return () => {};
    }

    Promise.all([
      apiRequest(`/api/versions/${encodeURIComponent(versionId)}`, { token }),
      apiRequest('/api/wallet', { token }).catch(() => null),
    ]).then(([version, wallet]) => {
      if (cancelled) return;
      setResult({ ...version, versionId: version.id, draft: draftFromOperations(version.operations) });
      if (wallet) setWalletBalance(wallet.balance);
      setStatus('ready');
    }).catch((error) => {
      if (cancelled) return;
      setLoadError(error.message || 'Could not load this result.');
      setStatus('error');
    });
    return () => { cancelled = true; };
  }, [versionId]);

  const operationRows = useMemo(() => {
    if (!result?.draft) return [];
    const rows = [];
    if (result.draft.wrap) rows.push(['WRAP', `${result.draft.wrap.color} · ${result.draft.wrap.finish}`]);
    if (result.draft.tint) rows.push(['TINT', `${result.draft.tint.name} (${result.draft.tint.level}%)`]);
    if (result.draft.wheel) rows.push(['WHEELS', result.draft.wheel.label]);
    return rows;
  }, [result]);

  async function continueEditing() {
    if (!result || isPreparing) return;
    setIsPreparing(true);
    setPrepareError('');
    try {
      const response = await fetch(result.sourceUrl);
      if (!response.ok) throw new Error('The source photo is unavailable.');
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'jpg';
      await savePendingPhoto(new File([blob], `project-car.${extension}`, { type: blob.type }));
      setProjectId(result.projectId);
      setUploadedProjectId(result.projectId);
      setDraft(result.draft || {});
      router.push('/configurator');
    } catch (error) {
      setPrepareError(error.message || 'Could not reopen this version.');
      setIsPreparing(false);
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    const token = getToken();
    if (!token || !result?.versionId) {
      setReportStatus('This saved version cannot be reported from the current session.');
      return;
    }
    setReportStatus('Sending…');
    try {
      const data = await apiRequest(`/api/versions/${encodeURIComponent(result.versionId)}/report`, {
        method: 'POST', token, body: { reason: reportReason, note: reportNote },
      });
      setReportStatus(data.already ? 'This version is already under review.' : 'Report saved for manual review.');
    } catch (error) {
      setReportStatus(error.message || 'Could not save the report.');
    }
  }

  if (status === 'loading') return <main className="resultEmpty"><h1>Loading result…</h1></main>;
  if (status === 'error' || !result) {
    return <main className="resultEmpty"><h1>Result unavailable</h1><p>{loadError}</p><button type="button" onClick={() => router.push('/garage')}>Open garage</button></main>;
  }

  return (
    <main className="resultPage">
      <header className="resultNav">
        <a href="/" className="resultBrand">Project Drive</a>
        <div className="resultNavLinks"><a href="/garage">Garage</a><a href="/credits" className="resultCredits">{walletBalance == null ? 'Local mock' : `${walletBalance} demo credits`}</a></div>
      </header>
      <section className="resultHeader">
        <div><p className="resultEyebrow">Generated version</p><h1>{result.projectName || 'Your car'} — new variation</h1><p>{operationRows.map(([, value]) => value).join(' · ')}</p></div>
        <div className="resultTopActions"><button type="button" onClick={continueEditing} disabled={isPreparing}>{isPreparing ? 'Opening…' : 'Continue editing'}</button><button type="button" onClick={() => router.push('/garage')}>Open garage</button></div>
      </section>
      {prepareError && <p className="resultError" role="alert">{prepareError}</p>}
      <section className="compareStage" aria-label="Before and after comparison">
        {/* Mock возвращает исходный файл, поэтому обе стороны сейчас одинаковые. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="beforeImage" src={result.sourceUrl} alt="Original car" />
        <div className="afterLayer" style={{ clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.outputUrl} alt="Generated car variation" />
        </div>
        <span className="beforeLabel">BEFORE</span><span className="afterLabel">AFTER</span>
        <div className="compareLine" style={{ left: `${compare}%` }}><span /></div>
        <input aria-label="Compare before and after" type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} />
      </section>
      <section className="resultActions">
        <a className="primaryResultAction" href={result.outputUrl} download>Download</a>
        <button type="button" onClick={continueEditing} disabled={isPreparing}>Regenerate</button>
        <button type="button" onClick={continueEditing} disabled={isPreparing}>Duplicate as new variation</button>
        <button className="reportButton" type="button" onClick={() => setShowReport((current) => !current)}>Report bad result</button>
      </section>
      {showReport && <form className="reportPanel" onSubmit={submitReport}>
        <div><span>MANUAL REVIEW</span><strong>What went wrong?</strong><small>This local report does not refund credits automatically.</small></div>
        <label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="artifacts">Visible artifacts</option><option value="car_changed">The car changed</option><option value="wheels_wrong">Wheels are incorrect</option><option value="wrap_wrong">Wrap is incorrect</option><option value="tint_wrong">Tint is incorrect</option><option value="other">Other</option></select></label>
        <label>Optional note<textarea maxLength="500" value={reportNote} onChange={(event) => setReportNote(event.target.value)} placeholder="Describe the problem briefly" /></label>
        <div className="reportSubmit"><button type="submit" disabled={reportStatus === 'Sending…'}>Send report</button>{reportStatus && <p role="status">{reportStatus}</p>}</div>
      </form>}
      <section className="resultMeta">
        {operationRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        <div><span>COST</span><strong>{result.creditsCharged} demo credits</strong></div>
        <div><span>ENGINE</span><strong>Local mock — $0</strong></div>
      </section>
    </main>
  );
}

'use client'

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePendingPhoto } from '../lib/pending-photo';
import './result.css';

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [compare, setCompare] = useState(50);
  const [walletBalance, setWalletBalance] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('artifacts');
  const [reportNote, setReportNote] = useState('');
  const [reportStatus, setReportStatus] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('project-drive-last-result');
    if (!saved) return;
    try { setResult(JSON.parse(saved)); } catch { /* Покажем понятное пустое состояние ниже. */ }

    const token = sessionStorage.getItem('project-drive-token');
    if (token) {
      fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => response.ok ? response.json() : null)
        .then((wallet) => { if (wallet) setWalletBalance(wallet.balance); })
        .catch(() => { /* Сам результат доступен даже без показателя баланса. */ });
    }
  }, []);

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
      // Историческая версия должна открываться независимо от того, какой файл
      // остался в IndexedDB после прошлой сессии. Восстанавливаем её исходник.
      const response = await fetch(result.sourceUrl);
      if (!response.ok) throw new Error('The source photo is unavailable.');
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'jpg';
      await savePendingPhoto(new File([blob], `project-car.${extension}`, { type: blob.type }));
      sessionStorage.setItem('project-drive-project-id', result.projectId);
      sessionStorage.setItem('project-drive-uploaded-project-id', result.projectId);
      localStorage.setItem('project-drive-draft', JSON.stringify(result.draft || {}));
      router.push('/configurator');
    } catch (error) {
      setPrepareError(error.message || 'Could not reopen this version.');
      setIsPreparing(false);
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    const token = sessionStorage.getItem('project-drive-token');
    if (!token || !result?.versionId) {
      setReportStatus('This saved version cannot be reported from the current session.');
      return;
    }
    setReportStatus('Sending…');
    try {
      const response = await fetch(`/api/versions/${encodeURIComponent(result.versionId)}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason, note: reportNote }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save the report.');
      setReportStatus(data.already ? 'This version is already under review.' : 'Report saved for manual review.');
    } catch (error) {
      setReportStatus(error.message || 'Could not save the report.');
    }
  }

  if (!result) {
    return <main className="resultEmpty"><h1>No generated result yet</h1><p>Return to the configurator and run the local mock generation.</p><button type="button" onClick={() => router.push('/configurator')}>Open configurator</button></main>;
  }

  return (
    <main className="resultPage">
      <header className="resultNav">
        <a href="/" className="resultBrand">Project Drive</a>
        <div className="resultNavLinks"><a href="/garage">Garage</a><a href="/credits" className="resultCredits">{walletBalance == null ? 'Local mock' : `${walletBalance} demo credits`}</a></div>
      </header>

      <section className="resultHeader">
        <div>
          <p className="resultEyebrow">Generated version</p>
          <h1>Your car — new variation</h1>
          <p>{operationRows.map(([, value]) => value).join(' · ')}</p>
        </div>
        <div className="resultTopActions">
          <button type="button" onClick={continueEditing} disabled={isPreparing}>{isPreparing ? 'Opening…' : 'Continue editing'}</button>
          <button type="button" onClick={() => router.push('/garage')}>Open garage</button>
        </div>
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

      {showReport && (
        <form className="reportPanel" onSubmit={submitReport}>
          <div><span>MANUAL REVIEW</span><strong>What went wrong?</strong><small>This local report does not refund credits automatically.</small></div>
          <label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="artifacts">Visible artifacts</option><option value="car_changed">The car changed</option><option value="wheels_wrong">Wheels are incorrect</option><option value="wrap_wrong">Wrap is incorrect</option><option value="tint_wrong">Tint is incorrect</option><option value="other">Other</option></select></label>
          <label>Optional note<textarea maxLength="500" value={reportNote} onChange={(event) => setReportNote(event.target.value)} placeholder="Describe the problem briefly" /></label>
          <div className="reportSubmit"><button type="submit" disabled={reportStatus === 'Sending…'}>Send report</button>{reportStatus && <p role="status">{reportStatus}</p>}</div>
        </form>
      )}

      <section className="resultMeta">
        {operationRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        <div><span>COST</span><strong>{result.creditsCharged} demo credits</strong></div>
        <div><span>ENGINE</span><strong>Local mock — $0</strong></div>
      </section>
    </main>
  );
}

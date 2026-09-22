'use client'

import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { parseCsv } from '../lib/csv';
import { getToken } from '../lib/storage';
import './admin.css';

const EMPTY_WHEEL = { brand: '', model: '', sizeLabel: 'R19', diameter: 19, color: '', finish: '', rightsSource: '', rightsBasis: '', isOem: false };

function eventLabel(name) {
  return String(name || '').replaceAll('_', ' ');
}

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [wheel, setWheel] = useState(EMPTY_WHEEL);
  const [reference, setReference] = useState({ variantId: '', file: null, angle: 'front', rightsSource: '', rightsBasis: '', watermarkFreeConfirmed: false });
  const [credit, setCredit] = useState({ userId: '', delta: '', reason: '' });
  const [message, setMessage] = useState('');
  const token = getToken();

  async function refresh() {
    try { setData(await apiRequest('/api/admin/overview', { token })); }
    catch (error) { setData(null); setMessage(error.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function createWheel(event) {
    event.preventDefault();
    try {
      const created = await apiRequest('/api/admin/wheels', { method: 'POST', token, body: wheel });
      setReference((current) => ({ ...current, variantId: created.id }));
      setWheel(EMPTY_WHEEL); setMessage('Wheel created hidden. Upload a valid reference, then publish it.'); await refresh();
    } catch (error) { setMessage(error.message); }
  }

  async function importCsv(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      const result = await apiRequest('/api/admin/wheels/import', { method: 'POST', token, body: { rows } });
      setMessage(`Imported ${result.created} hidden variants.`); await refresh();
    } catch (error) { setMessage(error.message); }
  }

  async function uploadReference(event) {
    event.preventDefault();
    if (!reference.file) return setMessage('Choose a PNG or WebP file.');
    const params = new URLSearchParams({ angle: reference.angle, rightsSource: reference.rightsSource, rightsBasis: reference.rightsBasis, watermarkFreeConfirmed: String(reference.watermarkFreeConfirmed) });
    try {
      await apiRequest(`/api/admin/wheels/${encodeURIComponent(reference.variantId)}/reference?${params}`, {
        method: 'POST', token, body: reference.file, headers: { 'Content-Type': reference.file.type },
      });
      setMessage('Reference validated and uploaded.'); await refresh();
    } catch (error) { setMessage(error.message); }
  }

  async function setVisibility(item) {
    try {
      await apiRequest(`/api/admin/wheels/${encodeURIComponent(item.id)}`, { method: 'PATCH', token, body: { visible: !item.visible } });
      setMessage(item.visible ? 'Wheel hidden.' : 'Wheel published.'); await refresh();
    } catch (error) { setMessage(error.message); }
  }

  async function adjustCredits(event) {
    event.preventDefault();
    try {
      await apiRequest('/api/admin/credits/adjust', { method: 'POST', token, body: { ...credit, delta: Number(credit.delta) } });
      setCredit({ userId: '', delta: '', reason: '' }); setMessage('Credits adjusted and recorded in the audit log.'); await refresh();
    } catch (error) { setMessage(error.message); }
  }

  return <main className="adminPage">
    <header><div><p>Project Drive</p><h1>Catalog admin</h1></div><a href="/configurator">Back to configurator</a></header>
    {message && <p className="adminMessage">{message}</p>}
    {!data ? <section className="adminGate"><h2>Admin access required</h2><p>Sign in with an email listed in PROJECT_DRIVE_ADMIN_EMAILS.</p></section> : <>
      <section className="adminStats"><article><strong>{data.wheels.length}</strong><span>Wheel variants</span></article><article><strong>{data.aiJobs.length}</strong><span>AI jobs</span></article><article><strong>{data.audit.length}</strong><span>Audit events</span></article><article><strong>{data.productAnalytics.totals.reduce((sum, item) => sum + item.count, 0)}</strong><span>Product events · {data.productAnalytics.days}d</span></article></section>
      <div className="adminGrid">
        <section className="adminCard adminWide"><h2>Project funnel</h2><p>Unique projects over the last {data.productAnalytics.days} days.</p><div className="funnelGrid"><article><strong>{data.productAnalytics.funnel.created}</strong><span>Created</span></article><article><strong>{data.productAnalytics.funnel.uploaded}</strong><span>Photo uploaded · {data.productAnalytics.funnel.uploadRate}%</span></article><article><strong>{data.productAnalytics.funnel.generated}</strong><span>Generation attempted · {data.productAnalytics.funnel.generationRate}%</span></article><article><strong>{data.productAnalytics.funnel.succeeded}</strong><span>Mock result saved · {data.productAnalytics.funnel.successRate}%</span></article><article><strong>{data.productAnalytics.funnel.reported}</strong><span>Reported · {data.productAnalytics.funnel.reportRate}%</span></article></div></section>
        <section className="adminCard"><h2>Add wheel</h2><p>New variants stay hidden until a valid reference is uploaded.</p><form onSubmit={createWheel} className="adminForm">
          {['brand', 'model', 'sizeLabel', 'diameter', 'color', 'finish', 'rightsSource', 'rightsBasis'].map((name) => <label key={name}>{name}<input required value={wheel[name]} type={name === 'diameter' ? 'number' : 'text'} onChange={(event) => setWheel((current) => ({ ...current, [name]: event.target.value }))} /></label>)}
          <label className="adminCheck"><input type="checkbox" checked={wheel.isOem} onChange={(event) => setWheel((current) => ({ ...current, isOem: event.target.checked }))} /> OEM brand</label><button type="submit">Create hidden variant</button>
        </form><label className="csvUpload">CSV import (up to 500 rows)<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label></section>

        <section className="adminCard"><h2>Reference image</h2><p>Only transparent, square PNG/WebP. Front and ¾ views are recorded separately.</p><form onSubmit={uploadReference} className="adminForm">
          <label>Variant<select required value={reference.variantId} onChange={(event) => setReference((current) => ({ ...current, variantId: event.target.value }))}><option value="">Choose</option>{data.wheels.map((item) => <option key={item.id} value={item.id}>{item.brand} {item.model} {item.size_label}</option>)}</select></label>
          <label>Angle<select value={reference.angle} onChange={(event) => setReference((current) => ({ ...current, angle: event.target.value }))}><option value="front">Front</option><option value="three_quarter">¾ view</option></select></label>
          {['rightsSource', 'rightsBasis'].map((name) => <label key={name}>{name}<input required value={reference[name]} onChange={(event) => setReference((current) => ({ ...current, [name]: event.target.value }))} /></label>)}
          <label className="adminCheck"><input required type="checkbox" checked={reference.watermarkFreeConfirmed} onChange={(event) => setReference((current) => ({ ...current, watermarkFreeConfirmed: event.target.checked }))} /> I confirm rights and no watermark</label>
          <input required type="file" accept="image/png,image/webp" onChange={(event) => setReference((current) => ({ ...current, file: event.target.files?.[0] || null }))} /><button type="submit">Validate and upload</button>
        </form></section>

        <section className="adminCard adminWide"><h2>Catalog</h2><div className="adminTable"><table><thead><tr><th>Wheel</th><th>Variant</th><th>Rights</th><th>References</th><th>Status</th></tr></thead><tbody>{data.wheels.map((item) => <tr key={item.id}><td>{item.brand} {item.model}</td><td>{item.size_label} · {item.color} · {item.finish}</td><td>{item.image_rights_source}<small>{item.image_rights_basis}</small></td><td>{item.reference_count}</td><td><button onClick={() => setVisibility(item)}>{item.visible ? 'Hide' : 'Publish'}</button></td></tr>)}</tbody></table></div></section>

        <section className="adminCard"><h2>Credit adjustment</h2><p>Every manual change requires a reason and is written to the audit log.</p><form onSubmit={adjustCredits} className="adminForm"><label>User<select required value={credit.userId} onChange={(event) => setCredit((current) => ({ ...current, userId: event.target.value }))}><option value="">Choose</option>{data.users.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label><label>Delta<input required type="number" value={credit.delta} onChange={(event) => setCredit((current) => ({ ...current, delta: event.target.value }))} /></label><label>Reason<input required value={credit.reason} onChange={(event) => setCredit((current) => ({ ...current, reason: event.target.value }))} /></label><button type="submit">Apply adjustment</button></form></section>
        <section className="adminCard"><h2>AI jobs</h2>{data.aiJobs.length ? data.aiJobs.map((job) => <div className="adminLog" key={job.id}><strong>{job.provider}</strong><span>{job.latency_ms ?? '—'} ms · ${job.cost_usd ?? 0} · {job.attempts} attempts</span>{job.error && <small>{job.error}</small>}</div>) : <p>No jobs yet. Real AI remains disabled.</p>}</section>
        <section className="adminCard"><h2>Product activity</h2><p>Local aggregate for the last {data.productAnalytics.days} days. No external tracker is used.</p>{data.productAnalytics.totals.length ? data.productAnalytics.totals.map((item) => <div className="metricRow" key={item.event_name}><span>{eventLabel(item.event_name)}</span><strong>{item.count}</strong></div>) : <p>No events yet.</p>}</section>
        <section className="adminCard adminWide"><h2>Recent product events</h2>{data.productAnalytics.recent.length ? data.productAnalytics.recent.map((item, index) => <div className="productEventRow" key={`${item.created_at}-${index}`}><time>{new Date(item.created_at).toLocaleString()}</time><strong>{eventLabel(item.event_name)}</strong><span>{item.project_id ? `project ${item.project_id.slice(0, 8)}…` : 'no project'}</span></div>) : <p>No events yet.</p>}</section>
        <section className="adminCard adminWide"><h2>Audit log</h2>{data.audit.slice(0, 20).map((item) => <div className="auditRow" key={item.id}><time>{new Date(item.created_at).toLocaleString()}</time><strong>{item.action}</strong><span>{item.entity_type} {item.entity_id || ''}</span></div>)}</section>
      </div>
    </>}
  </main>;
}

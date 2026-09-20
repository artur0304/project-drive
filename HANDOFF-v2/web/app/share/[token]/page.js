'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import './share.css';

export default function PublicResultPage() {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest(`/api/public/results/${encodeURIComponent(token)}`, { token: '' }).then(setResult).catch((cause) => setError(cause.message));
  }, [token]);
  if (error) return <main className="publicShareEmpty"><h1>Preview unavailable</h1><p>{error}</p></main>;
  if (!result) return <main className="publicShareEmpty"><h1>Loading preview…</h1></main>;
  return <main className="publicSharePage">
    <header><a href="/">Project Drive</a><span>PUBLIC PREVIEW</span></header>
    <section><p>Shared vehicle concept</p><h1>{result.projectName}</h1><div className="publicOperations">{result.operations.map((operation) => <span key={operation.kind}>{operation.kind.replace('_', ' ')}</span>)}</div></section>
    <figure className="publicPreview">
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={result.outputUrl} alt="Shared vehicle concept" />
      <div className="previewWatermark" aria-hidden="true">PROJECT DRIVE · PREVIEW</div>
    </figure>
    {result.generationStatus === 'partial' && <p className="publicWarning">Partial concept: {result.warning}</p>}
    <footer><a href="/">Create your own concept</a></footer>
  </main>;
}

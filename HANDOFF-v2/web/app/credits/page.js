'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './credits.css';

async function getLocal(path, token) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load credits.');
  return data;
}

function labelForReason(reason) {
  if (reason === 'generate') return 'Saved mock variation';
  if (reason === 'local_demo_balance') return 'Local demo balance';
  if (reason?.startsWith('refund')) return 'Returned after failed mock';
  if (reason?.startsWith('purchase')) return 'Credit package';
  return reason?.replaceAll('_', ' ') || 'Balance change';
}

export default function CreditsPage() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'loading', wallet: null, transactions: [], packs: {} });

  useEffect(() => {
    const token = sessionStorage.getItem('project-drive-token');
    if (!token) { setState((current) => ({ ...current, status: 'signed-out' })); return; }

    Promise.all([
      getLocal('/api/wallet', token),
      getLocal('/api/wallet/transactions', token),
      fetch('/api/packs').then((response) => response.json()),
    ]).then(([wallet, transactions, packs]) => {
      setState({ status: 'ready', wallet, transactions, packs });
    }).catch(() => {
      sessionStorage.removeItem('project-drive-token');
      setState((current) => ({ ...current, status: 'signed-out' }));
    });
  }, []);

  if (state.status === 'loading') return <main className="creditState">Loading credits…</main>;
  if (state.status === 'signed-out') {
    return <main className="creditState"><h1>Sign in to see credits</h1><p>The local account is created when you run your first mock.</p><button onClick={() => router.push('/upload')}>Upload a car</button></main>;
  }

  return (
    <main className="creditPage">
      <header className="creditNav">
        <a href="/" className="creditBrand"><span>PD</span>Project Drive</a>
        <nav><a href="/garage">Garage</a><a className="active" href="/credits">Credits</a><a href="/account">Account</a></nav>
      </header>

      <section className="creditHero">
        <div><p>LOCAL WALLET</p><h1>{state.wallet.balance}</h1><span>demo credits available</span></div>
        <div className="mockNotice"><strong>No real payment is connected</strong><span>Prices and checkout stay locked until the AI bake-off establishes the real cost per successful render.</span></div>
      </section>

      <section className="creditSection">
        <header><div><p>FUTURE PACKAGES</p><h2>Credit packs</h2></div><span>Draft pricing · unavailable</span></header>
        <div className="packGrid">
          {Object.entries(state.packs).map(([id, pack]) => (
            <article key={id}><p>{id.toUpperCase()}</p><h3>{pack.credits}<small> credits</small></h3><span>Placeholder ${(pack.amountCents / 100).toFixed(0)}</span><button type="button" disabled>Locked until bake-off</button></article>
          ))}
        </div>
      </section>

      <section className="creditSection transactionSection">
        <header><div><p>LEDGER</p><h2>Credit activity</h2></div><span>{state.transactions.length} entries</span></header>
        <div className="transactionList">
          {state.transactions.length === 0 ? <p className="emptyLedger">No activity yet.</p> : state.transactions.map((transaction) => (
            <div key={transaction.id}>
              <span className={transaction.delta > 0 ? 'plus' : 'minus'}>{transaction.delta > 0 ? '+' : ''}{transaction.delta}</span>
              <strong>{labelForReason(transaction.reason)}</strong>
              <time>{new Date(transaction.created_at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}</time>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

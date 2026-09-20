'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { getToken } from '../lib/storage';
import ProductNav from '../components/product-nav';
import './credits.css';

function labelForReason(reason) {
  if (reason === 'generate') return 'Saved mock variation';
  if (reason === 'local_demo_balance') return 'Local demo balance';
  if (reason === 'local_seed') return 'Manual local test credit';
  if (reason?.startsWith('refund')) return 'Returned after failed mock';
  if (reason?.startsWith('purchase')) return 'Credit package';
  return reason?.replaceAll('_', ' ') || 'Balance change';
}

export default function CreditsPage() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'loading', wallet: null, transactions: [], packs: {}, error: '' });

  useEffect(() => {
    const token = getToken();
    if (!token) { setState((current) => ({ ...current, status: 'signed-out' })); return; }

    Promise.all([
      apiRequest('/api/wallet', { token }),
      apiRequest('/api/wallet/transactions', { token }),
      apiRequest('/api/packs', { token: '' }),
    ]).then(([wallet, transactions, packs]) => {
      setState({ status: 'ready', wallet, transactions, packs });
    }).catch((error) => {
      setState((current) => ({
        ...current,
        status: error.status === 401 ? 'signed-out' : 'unavailable',
        error: error.message || 'Could not load credits.',
      }));
    });
  }, []);

  if (state.status === 'loading') return <main className="creditState">Loading credits…</main>;
  if (state.status === 'signed-out') {
    return <main className="creditState"><h1>Sign in to see credits</h1><p>The local account is created when you run your first mock.</p><button onClick={() => router.push('/upload')}>Upload a car</button></main>;
  }
  if (state.status === 'unavailable') {
    return <main className="creditState"><h1>Credits are temporarily unavailable</h1><p>{state.error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></main>;
  }

  return (
    <main className="creditPage">
      <ProductNav active="credits" balance={state.wallet.balance} />

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

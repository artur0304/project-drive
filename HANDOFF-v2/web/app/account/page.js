'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { clearSession, getToken } from '../lib/storage';
import ProductNav from '../components/product-nav';
import './account.css';

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState({ status: 'loading', user: null, projects: [], wallet: null, error: '' });
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { setData((current) => ({ ...current, status: 'signed-out' })); return; }
    Promise.all([
      apiRequest('/api/auth/me', { token }),
      apiRequest('/api/projects', { token }),
      apiRequest('/api/wallet', { token }),
    ]).then(([user, projects, wallet]) => setData({ status: 'ready', user, projects, wallet, error: '' }))
      .catch((error) => setData((current) => ({
        ...current,
        status: error.status === 401 ? 'signed-out' : 'unavailable',
        error: error.message || 'Could not load account.',
      })));
  }, []);

  async function signOut() {
    const token = getToken();
    if (token) await apiRequest('/api/auth/logout', { token, method: 'POST' }).catch(() => {});
    clearSession();
    router.push('/');
  }

  async function exportData() {
    const token = getToken();
    setExportStatus('Preparing export…');
    try {
      const exported = await apiRequest('/api/account/export', { token });
      const blob = new Blob([`${JSON.stringify(exported, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-drive-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus('Export downloaded.');
    } catch (error) {
      setExportStatus(error.message || 'Could not export account data.');
    }
  }

  if (data.status === 'loading') return <main className="accountState">Loading account…</main>;
  if (data.status === 'signed-out') return <main className="accountState"><h1>No active local session</h1><p>Sign in to reopen your saved garage.</p><button onClick={() => router.push('/login')}>Sign in</button></main>;
  if (data.status === 'unavailable') return <main className="accountState"><h1>Account is temporarily unavailable</h1><p>{data.error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></main>;

  const initial = (data.user.name || data.user.email || 'P').slice(0, 1).toUpperCase();
  return (
    <main className="accountPage">
      <ProductNav active="account" balance={data.wallet.balance} maxWidth="1050px" />
      <section className="accountHeader"><p>LOCAL PROFILE</p><h1>Account</h1><span>This profile exists only in the Project Drive database on this computer.</span></section>
      <section className="accountGrid">
        <article className="profileCard"><div className="avatar">{initial}</div><div><p>PROFILE</p><h2>{data.user.name || 'Project Drive user'}</h2><span>{data.user.email}</span></div></article>
        <article className="statCard"><p>GARAGE</p><strong>{data.projects.length}</strong><span>{data.projects.length === 1 ? 'car project' : 'car projects'}</span></article>
        <article className="statCard"><p>WALLET</p><strong>{data.wallet.balance}</strong><span>demo credits</span></article>
      </section>
      <section className="accountPanel"><div><p>SESSION</p><h2>Local email sign-in</h2><span>Google OAuth and paid services are not connected.</span></div><button type="button" onClick={signOut}>Sign out</button></section>
      <section className="accountPanel"><div><p>YOUR DATA</p><h2>Download account export</h2><span>Projects, versions, credit history, wheel lists and local activity. Passwords and session tokens are excluded.</span>{exportStatus && <small className="exportStatus" role="status">{exportStatus}</small>}</div><button type="button" onClick={exportData}>Download JSON</button></section>
    </main>
  );
}

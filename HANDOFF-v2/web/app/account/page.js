'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { clearSession, getToken } from '../lib/storage';
import './account.css';

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState({ status: 'loading', user: null, projects: [], wallet: null });

  useEffect(() => {
    const token = getToken();
    if (!token) { setData((current) => ({ ...current, status: 'signed-out' })); return; }
    Promise.all([
      apiRequest('/api/auth/me', { token }),
      apiRequest('/api/projects', { token }),
      apiRequest('/api/wallet', { token }),
    ]).then(([user, projects, wallet]) => setData({ status: 'ready', user, projects, wallet }))
      .catch(() => setData((current) => ({ ...current, status: 'signed-out' })));
  }, []);

  async function signOut() {
    const token = getToken();
    if (token) await apiRequest('/api/auth/logout', { token, method: 'POST' }).catch(() => {});
    clearSession();
    router.push('/');
  }

  if (data.status === 'loading') return <main className="accountState">Loading account…</main>;
  if (data.status === 'signed-out') return <main className="accountState"><h1>No active local session</h1><p>Sign in to reopen your saved garage.</p><button onClick={() => router.push('/login')}>Sign in</button></main>;

  const initial = (data.user.name || data.user.email || 'P').slice(0, 1).toUpperCase();
  return (
    <main className="accountPage">
      <header className="accountNav">
        <a href="/" className="accountBrand"><span>PD</span>Project Drive</a>
        <nav><a href="/garage">Garage</a><a href="/credits">Credits</a><a className="active" href="/account">Account</a></nav>
      </header>
      <section className="accountHeader"><p>LOCAL PROFILE</p><h1>Account</h1><span>This profile exists only in the Project Drive database on this computer.</span></section>
      <section className="accountGrid">
        <article className="profileCard"><div className="avatar">{initial}</div><div><p>PROFILE</p><h2>{data.user.name || 'Project Drive user'}</h2><span>{data.user.email}</span></div></article>
        <article className="statCard"><p>GARAGE</p><strong>{data.projects.length}</strong><span>{data.projects.length === 1 ? 'car project' : 'car projects'}</span></article>
        <article className="statCard"><p>WALLET</p><strong>{data.wallet.balance}</strong><span>demo credits</span></article>
      </section>
      <section className="accountPanel"><div><p>SESSION</p><h2>Local email sign-in</h2><span>Google OAuth and paid services are not connected.</span></div><button type="button" onClick={signOut}>Sign out</button></section>
    </main>
  );
}

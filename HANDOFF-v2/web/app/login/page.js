'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { getToken, setToken } from '../lib/storage';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest('/api/auth/me', { token })
      .then(() => router.replace('/garage'))
      .catch(() => { /* Показываем форму, если локальный API временно недоступен. */ });
  }, [router]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await apiRequest(`/api/auth/${mode}`, {
        method: 'POST', token: '',
        body: { email: email.trim(), password, ...(mode === 'register' ? { name: name.trim() } : {}) },
      });
      setToken(data.token);
      router.push('/garage');
    } catch (submitError) {
      setError(submitError.message || 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <main className="loginPage">
      <div className="loginGrid" aria-hidden="true" />
      <header className="loginNav"><a href="/"><span>PD</span>Project Drive</a><a href="/upload">Upload a car</a></header>
      <section className="loginLayout">
        <div className="loginIntro"><p>RETURNING DRIVER</p><h1>Your builds are waiting.</h1><span>Sign in to open saved cars, versions and your local demo balance.</span><div><b>Local only</b><small>No Google account, payment service or external AI is connected.</small></div></div>
        <div className="loginCard">
          <div className="loginModes" role="tablist" aria-label="Account action"><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button></div>
          <form onSubmit={submit}>
            {mode === 'register' && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></label>}
            <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></label>
            <label>Password<input type="password" required minLength="6" maxLength="128" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" /></label>
            {error && <p className="loginError" role="alert">{error}</p>}
            <button className="loginSubmit" type="submit" disabled={busy}>{busy ? 'Opening garage…' : mode === 'login' ? 'Sign in to garage' : 'Create account'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

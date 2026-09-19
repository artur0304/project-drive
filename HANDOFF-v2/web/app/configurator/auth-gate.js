'use client'

import { useState } from 'react';

// Auth gate появляется только после Generate. Так гость сначала загружает фото
// и собирает draft, а регистрация не мешает ему раньше времени.
export default function AuthGate({ busy, error, onClose, onSubmit }) {
  const [mode, setMode] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    onSubmit({ mode, name: name.trim(), email: email.trim(), password });
  }

  return (
    <div className="gateBackdrop" role="presentation" onMouseDown={busy ? undefined : onClose}>
      <section className="authGate" role="dialog" aria-modal="true" aria-labelledby="gate-title" onMouseDown={(event) => event.stopPropagation()}>
        {!busy && <button className="gateClose" type="button" aria-label="Close" onClick={onClose}>×</button>}
        <p className="gateEyebrow">Draft saved</p>
        <h2 id="gate-title">{busy ? 'Preparing your result…' : 'Sign in to generate'}</h2>

        {busy ? (
          <div className="generationProgress" role="status">
            <span className="progressSpinner" />
            <p>Your photo and settings are being connected to the local mock generator.</p>
          </div>
        ) : (
          <>
            <p>Your photo and every selected setting will stay exactly as they are.</p>
            <div className="authMode" role="tablist" aria-label="Account action">
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
            </div>

            <form className="authForm" onSubmit={submit}>
              {mode === 'register' && <label>Name <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></label>}
              <label>Email <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></label>
              <label>Password <input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder="At least 6 characters" /></label>
              {error && <p className="authError" role="alert">{error}</p>}
              <button className="authSubmit" type="submit">{mode === 'register' ? 'Create account and continue' : 'Sign in and continue'}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

'use client'

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './lib/api';
import { getToken } from './lib/storage';
import './landing.css';

const KEYFRAMES = [
  { point: 0, body: '#B9BCC1', wheel: '#B9BCC1', tint: 0, lead: 'This is', accent: 'your car.', sub: 'Scroll to see the same car take on a new direction.', cap: 'STOCK · AS UPLOADED' },
  { point: .34, body: '#141414', wheel: '#B9BCC1', tint: .2, lead: 'Change the', accent: 'wrap.', sub: 'Gloss, satin or matte — explored on the car you already own.', cap: 'WRAP · JET BLACK' },
  { point: .67, body: '#141414', wheel: '#1A1A1A', tint: .6, lead: 'Swap the', accent: 'wheels.', sub: 'Compare a complete visual direction before visiting the shop.', cap: 'WHEELS · GLOSS BLACK · TINT' },
  { point: 1, body: '#33463A', wheel: '#1A1A1A', tint: .85, lead: 'Make it', accent: 'yours.', sub: 'Racing green, satin. Saved as a version in your garage.', cap: 'FINISHED · RACING GREEN SATIN' },
];

function hexToRgb(value) {
  const hex = value.replace('#', '');
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function toHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(first, second, amount) {
  const a = hexToRgb(first); const b = hexToRgb(second);
  return toHex(...a.map((value, index) => value + (b[index] - value) * amount));
}

function shade(color, amount) {
  const [red, green, blue] = hexToRgb(color);
  return toHex(red + amount, green + amount, blue + amount);
}

function stateAt(progress) {
  let from = KEYFRAMES[0]; let to = KEYFRAMES.at(-1);
  for (let index = 0; index < KEYFRAMES.length - 1; index += 1) {
    if (progress >= KEYFRAMES[index].point && progress <= KEYFRAMES[index + 1].point) {
      from = KEYFRAMES[index]; to = KEYFRAMES[index + 1]; break;
    }
  }
  const amount = Math.max(0, Math.min(1, (progress - from.point) / (to.point - from.point || 1)));
  return {
    body: mix(from.body, to.body, amount), wheel: mix(from.wheel, to.wheel, amount),
    tint: from.tint + (to.tint - from.tint) * amount,
    text: amount < .5 ? from : to,
  };
}

function Wheel({ center, color }) {
  return <g><circle cx={center} cy="210" r="40" fill="#0C0E12" /><circle cx={center} cy="210" r="24" fill={color} /><g stroke={shade(color, -46)} strokeWidth="2.4"><line x1={center} y1="188" x2={center} y2="232" /><line x1={center - 22} y1="210" x2={center + 22} y2="210" /><line x1={center - 15} y1="195" x2={center + 15} y2="225" /><line x1={center + 15} y1="195" x2={center - 15} y2="225" /></g><circle cx={center} cy="210" r="6" fill="#0C0E12" /></g>;
}

function CarDrawing({ body, wheel, tint }) {
  const glass = mix('#2A333C', '#10151A', tint);
  return (
    <svg viewBox="0 0 800 300" role="img" aria-label="Car changing colour and wheels as the page scrolls">
      <defs><linearGradient id="landingBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={shade(body, 42)} /><stop offset="55%" stopColor={body} /><stop offset="100%" stopColor={shade(body, -52)} /></linearGradient></defs>
      <path d="M92 206 C97 165 140 142 198 138 L252 104 C266 95 288 90 310 90 L470 90 C500 90 524 98 543 116 L598 150 C656 154 700 170 710 202 L712 210 L694 210 C694 191 677 178 656 178 C635 178 618 191 618 210 L282 210 C282 191 265 178 244 178 C223 178 206 191 206 210 L94 210 Z" fill="url(#landingBody)" stroke={shade(body, -70)} strokeWidth="2" />
      <path d="M260 138 L292 108 C302 99 316 94 330 94 L452 94 C470 94 486 100 498 112 L527 138 Z" fill={glass} stroke={shade(body, -70)} strokeWidth="1.5" />
      <ellipse cx="104" cy="176" rx="9" ry="6" fill="#F4E7C9" opacity=".9" /><rect x="696" y="170" width="13" height="7" rx="2" fill="#7A1414" />
      <Wheel center={244} color={wheel} /><Wheel center={656} color={wheel} />
    </svg>
  );
}

export default function HomePage() {
  const [progress, setProgress] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [waitEmail, setWaitEmail] = useState('');
  const [waitMsg, setWaitMsg] = useState(null);

  async function joinWaitlist(event) {
    event.preventDefault();
    const email = waitEmail.trim();
    if (!email) return;
    try {
      const result = await apiRequest('/api/waitlist', { method: 'POST', token: '', body: { email } });
      setWaitMsg(result.duplicate ? "You're already on the list — we'll be in touch." : "Thanks — you're on the waitlist. We'll send an invite code.");
      setWaitEmail('');
    } catch (error) {
      setWaitMsg(error.message || 'Could not join the waitlist. Try again.');
    }
  }
  const car = useMemo(() => stateAt(progress), [progress]);

  useEffect(() => {
    let animationFrame = 0;
    function updateProgress() {
      const hero = document.getElementById('landingHero');
      if (!hero) return;
      const rectangle = hero.getBoundingClientRect();
      const total = hero.offsetHeight - window.innerHeight;
      setProgress(Math.max(0, Math.min(1, -rectangle.top / total)));
    }
    function onScroll() {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateProgress);
    }
    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(animationFrame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest('/api/auth/me', { token })
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, []);

  const activeStep = Math.min(3, Math.floor(progress * 4.01));
  return (
    <main className="landingPage">
      <nav className="landingNav"><a className="landingLogo" href="/"><span>PD</span>Project Drive</a><div><a href="/garage">Garage</a><a href={signedIn ? '/account' : '/login'}>{signedIn ? 'Account' : 'Sign in'}</a><a className="navCta" href="/upload">Upload your car</a></div></nav>
      <aside className="landingRail" aria-hidden="true">{KEYFRAMES.map((frame, index) => <i className={index <= activeStep ? 'on' : ''} key={frame.point} />)}</aside>
      <section className="landingHero" id="landingHero"><div className="landingPin">
        <div className="landingHeadline"><h1>{car.text.lead} <em>{car.text.accent}</em></h1><p>{car.text.sub}</p></div>
        <div className="landingCar"><CarDrawing body={car.body} wheel={car.wheel} tint={car.tint} /></div><div className="landingFloor" />
        <span className="landingCaption">{car.text.cap}</span><a className={`landingHeroCta ${progress > .9 ? 'show' : ''}`} href="/upload">Start with your photo</a>
      </div></section>
      <section className="landingStory"><div><p className="sectionLabel">THE IDEA</p><h2>Decide on the build before the first piece changes.</h2><p>Upload one clear photo of your own car. Explore a <strong>wrap colour</strong>, <strong>window tint</strong> and <strong>wheels</strong> as one coherent direction. Keep the versions that feel right in your garage.</p></div></section>
      <section className="landingSteps"><div><p>01</p><h3>Upload</h3><span>One exterior photo of your car.</span></div><div><p>02</p><h3>Configure</h3><span>Choose the visual changes.</span></div><div><p>03</p><h3>Compare</h3><span>Review and save each version.</span></div></section>
      <section className="landingWaitlist">
        <p className="sectionLabel">CLOSED BETA</p><h2>Want early access?</h2>
        <p>Leave your email and we&apos;ll send you an invite code to try it on your own car.</p>
        <form className="waitlistForm" onSubmit={joinWaitlist}>
          <input type="email" required value={waitEmail} onChange={(event) => setWaitEmail(event.target.value)} placeholder="you@example.com" aria-label="Email for early access" />
          <button type="submit">Request access</button>
        </form>
        {waitMsg && <p className="waitlistMsg" role="status">{waitMsg}</p>}
      </section>
      <section className="landingClose"><p className="sectionLabel">PROJECT DRIVE</p><h2>See the build <em>on your car</em>, then decide.</h2><a href="/upload">Upload your car</a></section>
      <footer className="landingFooter"><span>Project Drive</span><span>Local preview · AI generation disabled</span></footer>
    </main>
  );
}

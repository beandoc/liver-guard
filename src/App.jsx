
import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import Results from './components/Results'
import StroopTest from './components/StroopTest'
import OcularMenu from './components/OcularTests/OcularMenu'
import LandingPage from './components/LandingPage'
import ClinicalDashboard from './components/ClinicalDashboard'
import { TRANSLATIONS } from './translations'
import { OCULAR_TRANSLATIONS } from './components/OcularTests/constants'
import './App.css'

const SVGLogo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 5C11.7157 5 5 11.7157 5 20C5 28.2843 11.7157 35 20 35C28.2843 35 35 28.2843 35 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 20C12 15.5817 15.5817 12 20 12C24.4183 12 28 15.5817 28 20C28 24.4183 24.4183 28 20 28" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
    <defs>
      <linearGradient id="logo-grad" x1="12" y1="12" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

const IntroScreen = ({ accent, accentBg, accentBorder, badge, label, title, desc, ctaLabel, onBack, onStart, meta = [] }) => (
  <div style={{ minHeight: '100vh', width: '100%', background: '#030712', color: 'white', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    {/* Background orbs */}
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '55%', height: '55%', background: `radial-gradient(circle, ${accentBg} 0%, transparent 70%)`, animation: 'menuOrbFloat 9s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', animation: 'menuOrbFloat 11s ease-in-out infinite reverse' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)' }} />
    </div>
    {/* Nav */}
    <nav style={{ position: 'relative', zIndex: 10, maxWidth: 680, margin: '0 auto', width: '100%', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', fontSize: 16, transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}>←</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(79,70,229,0.4)' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>Liver<span style={{ color: '#818cf8' }}>Guard</span></span>
      </div>
    </nav>
    {/* Content */}
    <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px 60px' }}>
      <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 9999, padding: '5px 14px', marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, border: `1px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: accent }}>{label}</div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{badge}</span>
        </div>
        {/* Title */}
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px', color: 'white' }}>{title}</h1>
        {/* Description card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
          <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>{desc}</p>
        </div>
        {/* Meta chips */}
        {meta.length > 0 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
            {meta.map((m, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{m.value}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</span>
              </div>
            ))}
          </div>
        )}
        {/* CTA */}
        <button onClick={onStart} style={{ width: '100%', padding: '16px', background: accent, border: 'none', borderRadius: 14, color: 'white', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: `0 0 40px -10px ${accent}`, transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 60px -10px ${accent}`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 0 40px -10px ${accent}`; }}>
          {ctaLabel}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </button>
      </div>
    </div>
  </div>
);

function App() {
  const [view, setView] = useState('landing'); // 'landing', 'menu', 'dashboard', etc.
  const [trailsTime, setTrailsTime] = useState(0);
  const [activeTest, setActiveTest] = useState('A');
  const [lang, setLang] = useState('en');

  // Central Session State for Clinical Summary
  const [sessionResults, setSessionResults] = useState({
    nctA: null,
    nctB: null,
    stroop: null,
    ocular: null
  });

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const t_ocular = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;

  const startTrailsA = () => { setActiveTest('A'); setView('trails-a-game'); };
  const startTrailsB = () => { setActiveTest('B'); setView('trails-b-game'); };

  const handleTrailsComplete = (time) => {
    setTrailsTime(time);
    const key = activeTest === 'A' ? 'nctA' : 'nctB';
    setSessionResults(prev => ({ ...prev, [key]: { time } }));
    setView('trails-results');
  };

  const handleStroopComplete = (results) => {
    setSessionResults(prev => ({ ...prev, stroop: { diff: (results.on.time - results.off.time) / 1000 } }));
    setView('menu');
  };

  const handleOcularComplete = (score) => {
    setSessionResults(prev => ({ ...prev, ocular: { score } }));
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-slate-950 text-slate-50 p-4 text-center overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse"
          style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}
        ></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: '1s', backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
        ></div>
        <div
          className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[80px] animate-pulse"
          style={{ animationDelay: '2s', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
        ></div>
      </div>

      {/* Landing Page */}
      {view === 'landing' && (
        <LandingPage onStart={() => setView('menu')} onDashboard={() => setView('dashboard')} lang={lang} setLang={setLang} />
      )}

      {/* Main Menu */}
      {view === 'menu' && (
        <div style={{ minHeight: '100vh', width: '100%', background: '#030712', color: 'white', position: 'relative', overflowX: 'hidden', overflowY: 'auto' }}>
          <style>{`
            @keyframes menuOrbFloat {
              0%, 100% { transform: translate(0,0) scale(1); }
              50% { transform: translate(2%, 3%) scale(1.04); }
            }
            .menu-test-card {
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 20px;
              padding: 28px;
              cursor: pointer;
              transition: transform 0.3s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease;
              position: relative;
              overflow: hidden;
              text-align: left;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .menu-test-card:hover {
              transform: translateY(-5px);
              background: rgba(255,255,255,0.055);
              border-color: rgba(255,255,255,0.14);
            }
            .menu-test-card:active { transform: scale(0.98); }
          `}</style>

          {/* Background orbs */}
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)', animation: 'menuOrbFloat 9s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '45%', height: '45%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', animation: 'menuOrbFloat 11s ease-in-out infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)' }} />
          </div>

          {/* Navbar */}
          <nav style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(79,70,229,0.4)' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Liver<span style={{ color: '#818cf8' }}>Guard</span></span>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#475569', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '2px 8px' }}>Clinical v2.5</span>
            </div>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, padding: 3 }}>
              {['en', 'hi', 'mr'].map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 12px', borderRadius: 9999, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', cursor: 'pointer', background: lang === l ? '#4f46e5' : 'transparent', color: lang === l ? 'white' : '#64748b', transition: 'all 0.2s ease' }}>{l}</button>
              ))}
            </div>
          </nav>

          {/* Hero header */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '24px 24px 40px', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 9999, padding: '5px 14px', marginBottom: 20 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.05em' }}>Select a Diagnostic Protocol</span>
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px' }}>
              <span style={{ color: 'white' }}>Assessment </span>
              <span style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Protocol Suite</span>
            </h1>
            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              {t.clinical_note} · Digital Psychometric Evaluation
            </p>
          </div>

          {/* Test Cards Grid */}
          <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '0 20px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[
              { view: 'trails-a-intro', num: 'I', label: t.trails_test, sub: t.detect_overt, glow: 'rgba(59,130,246,0.18)', accent: '#3b82f6', accentBg: 'rgba(59,130,246,0.1)', icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, time: '~3 min' },
              { view: 'trails-b-intro', num: 'II', label: t.trails_b_test, sub: t.detect_executive, glow: 'rgba(139,92,246,0.18)', accent: '#8b5cf6', accentBg: 'rgba(139,92,246,0.1)', icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, time: '~4 min' },
              { view: 'stroop', num: 'III', label: t.stroop_test, sub: t.detect_minimal, glow: 'rgba(16,185,129,0.18)', accent: '#10b981', accentBg: 'rgba(16,185,129,0.1)', icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>, time: '~2 min' },
              { view: 'ocular', num: 'IV', label: t_ocular.ocular_tests_title, sub: 'Digital Biomarker Analysis · Webcam', glow: 'rgba(79,70,229,0.18)', accent: '#4f46e5', accentBg: 'rgba(79,70,229,0.1)', icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, time: '~8 min' },
            ].map(card => (
              <button
                key={card.view}
                className="menu-test-card"
                onClick={() => setView(card.view)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 20px 40px -10px ${card.glow}`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Glow orb */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: `radial-gradient(circle, ${card.glow} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: card.accentBg, border: `1px solid ${card.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.accent }}>
                    {card.icon}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '4px 10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.time}</span>
                  </div>
                </div>
                {/* Labels */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: card.accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, opacity: 0.8 }}>Protocol {card.num}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', letterSpacing: '-0.01em', marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>{card.sub}</div>
                </div>
                {/* Arrow */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>→</div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setView('dashboard')}
              style={{ width: '100%', padding: '16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, color: '#34d399', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.3s ease', letterSpacing: '-0.01em' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.14)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.07)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
              Physician Dashboard
            </button>
            <p style={{ fontSize: '10px', color: '#1e3a5f', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
              For Clinical Research Use Only · LiverGuard Clinical Systems
            </p>
          </div>
        </div>
      )}


      {/* Clinical Dashboard */}
      {
        view === 'dashboard' && (
          <ClinicalDashboard results={sessionResults} onExit={() => setView('menu')} />
        )
      }

      {/* Trails A Test Flow */}
      {
        view === 'trails-a-intro' && (
          <IntroScreen
            accent="#3b82f6"
            accentBg="rgba(59,130,246,0.12)"
            accentBorder="rgba(59,130,246,0.25)"
            badge="Protocol I · NCT-A"
            label="A"
            title={t.trails_intro}
            desc={t.trails_desc}
            ctaLabel={t.trails_start}
            onBack={() => setView('menu')}
            onStart={startTrailsA}
            meta={[{ label: 'Duration', value: '~3 min' }, { label: 'Points', value: '25' }, { label: 'Norm', value: '< 50s' }]}
          />
        )
      }

      {
        view === 'trails-a-game' && (
          <GameCanvas onComplete={handleTrailsComplete} onExit={() => setView('menu')} testType="A" totalPoints={25} lang={lang} />
        )
      }

      {/* Trails B Test Flow */}
      {
        view === 'trails-b-intro' && (
          <IntroScreen
            accent="#8b5cf6"
            accentBg="rgba(139,92,246,0.12)"
            accentBorder="rgba(139,92,246,0.25)"
            badge="Protocol II · NCT-B"
            label="B"
            title={t.trails_b_intro}
            desc={t.trails_b_desc}
            ctaLabel={t.trails_b_start}
            onBack={() => setView('menu')}
            onStart={startTrailsB}
            meta={[{ label: 'Duration', value: '~4 min' }, { label: 'Points', value: '25' }, { label: 'Norm', value: '< 90s' }]}
          />
        )
      }

      {
        view === 'trails-b-game' && (
          <GameCanvas onComplete={handleTrailsComplete} onExit={() => setView('menu')} testType="B" lang={lang} />
        )
      }

      {
        view === 'trails-results' && (
          <div style={{ minHeight: '100vh', width: '100%', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: 480 }}>
              <Results currentTime={trailsTime} testId={activeTest} onRetry={() => setView('menu')} lang={lang} />
            </div>
          </div>
        )
      }

      {/* Stroop Test Flow */}
      {
        view === 'stroop' && (
          <div style={{ minHeight: '100vh', width: '100%', background: '#030712', display: 'flex', flexDirection: 'column' }}>
            <StroopTest
              onComplete={handleStroopComplete}
              onExit={() => setView('menu')}
              lang={lang}
            />
          </div>
        )
      }

      {/* Ocular Tests Flow */}
      {
        view === 'ocular' && (
          <div style={{ minHeight: '100vh', width: '100%', background: '#030712', overflowY: 'auto' }}>
            <OcularMenu
              onExit={() => setView('menu')}
              onUpdate={handleOcularComplete}
              lang={lang}
            />
          </div>
        )
      }

    </div >
  )
}

export default App

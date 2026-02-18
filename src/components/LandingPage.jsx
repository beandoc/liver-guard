import React, { useEffect, useRef } from 'react';

const LandingPage = ({ onStart, onDashboard, lang, setLang }) => {

    const features = [
        {
            id: 'nct',
            color: 'from-blue-500 to-cyan-500',
            glow: 'rgba(59,130,246,0.15)',
            icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
            ),
            title: "Number Connection Test",
            subtitle: "NCT-A & NCT-B",
            desc: "Measures psychomotor speed and executive function through sequential target-linking tasks, validated against PHES norms.",
            stat: "< 50s", statLabel: "Normal threshold"
        },
        {
            id: 'stroop',
            color: 'from-emerald-500 to-teal-500',
            glow: 'rgba(16,185,129,0.15)',
            icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
            ),
            title: "Stroop Color Test",
            subtitle: "Inhibitory Control",
            desc: "Quantifies selective attention and cognitive interference through color-word incongruence paradigms with millisecond precision.",
            stat: "Δ < 5s", statLabel: "Interference threshold"
        },
        {
            id: 'ocular',
            color: 'from-violet-500 to-purple-600',
            glow: 'rgba(139,92,246,0.15)',
            icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            title: "Ocular-Motor Analysis",
            subtitle: "5-Protocol Battery",
            desc: "AI-driven webcam tracking of saccadic latency, fixation stability, smooth pursuit gain, and antisaccade error rates.",
            stat: "> 70%", statLabel: "Accuracy threshold"
        },
        {
            id: 'dashboard',
            color: 'from-rose-500 to-pink-600',
            glow: 'rgba(244,63,94,0.15)',
            icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
            ),
            title: "Clinical Dashboard",
            subtitle: "Decision Support",
            desc: "Aggregates all biomarkers into a unified PHES-correlated risk score with exportable PDF reports for clinical records.",
            stat: "4 Pillars", statLabel: "Biomarker domains"
        }
    ];

    const stats = [
        { value: "< 8 min", label: "Full Protocol" },
        { value: "±50ms", label: "Timing Precision" },
        { value: "3 Lang", label: "EN / HI / MR" },
        { value: "HIPAA", label: "Compliant" },
    ];

    return (
        <div className="min-h-screen w-full text-white relative overflow-x-hidden" style={{ background: '#030712' }}>

            {/* ── Animated Background ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Large orbs */}
                <div style={{
                    position: 'absolute', top: '-20%', left: '-10%',
                    width: '60%', height: '60%',
                    background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)',
                    animation: 'orbFloat 8s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', right: '-10%',
                    width: '55%', height: '55%',
                    background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 70%)',
                    animation: 'orbFloat 10s ease-in-out infinite reverse',
                }} />
                <div style={{
                    position: 'absolute', top: '40%', left: '30%',
                    width: '40%', height: '40%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
                    animation: 'orbFloat 12s ease-in-out infinite 2s',
                }} />
                {/* Fine grid */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
                    backgroundSize: '72px 72px',
                    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
                }} />
            </div>

            <style>{`
                @keyframes orbFloat {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(2%, 3%) scale(1.03); }
                    66% { transform: translate(-2%, -2%) scale(0.97); }
                }
                @keyframes heroIn {
                    from { opacity: 0; transform: translateY(32px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes badgePulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0.4); }
                    50% { box-shadow: 0 0 0 8px rgba(79,70,229,0); }
                }
                .hero-animate { animation: heroIn 0.9s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
                .delay-1 { animation-delay: 0.1s; }
                .delay-2 { animation-delay: 0.25s; }
                .delay-3 { animation-delay: 0.4s; }
                .delay-4 { animation-delay: 0.55s; }
                .feature-card {
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 20px;
                    padding: 28px;
                    transition: transform 0.3s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s ease, border-color 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    cursor: default;
                }
                .feature-card:hover {
                    transform: translateY(-6px);
                    border-color: rgba(255,255,255,0.14);
                }
                .stat-pill {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 9999px;
                    padding: 10px 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                }
                .cta-primary {
                    background: white;
                    color: #0f172a;
                    border-radius: 9999px;
                    padding: 14px 32px;
                    font-weight: 700;
                    font-size: 1rem;
                    letter-spacing: -0.01em;
                    border: none;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: transform 0.3s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s ease;
                    box-shadow: 0 0 40px -10px rgba(255,255,255,0.5);
                    position: relative;
                    overflow: hidden;
                }
                .cta-primary:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 0 60px -10px rgba(255,255,255,0.6);
                }
                .cta-secondary {
                    background: rgba(255,255,255,0.05);
                    color: #cbd5e1;
                    border-radius: 9999px;
                    padding: 14px 32px;
                    font-weight: 600;
                    font-size: 1rem;
                    border: 1px solid rgba(255,255,255,0.1);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(12px);
                }
                .cta-secondary:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border-color: rgba(255,255,255,0.2);
                }
                .badge-live {
                    animation: badgePulse 2s ease-in-out infinite;
                }
            `}</style>

            {/* ── Navbar ── */}
            <nav style={{ position: 'relative', zIndex: 50, maxWidth: '1280px', margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: 36, height: 36,
                        background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                        borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(79,70,229,0.4)'
                    }}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                        Liver<span style={{ color: '#818cf8' }}>Guard</span>
                    </span>
                    <span style={{
                        fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em',
                        textTransform: 'uppercase', color: '#64748b',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 6, padding: '2px 8px',
                        display: window.innerWidth < 480 ? 'none' : 'inline'
                    }}>Clinical v2.5</span>
                </div>

                {/* Language Switcher */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, padding: 4 }}>
                    {['en', 'hi', 'mr'].map(l => (
                        <button key={l} onClick={() => setLang(l)} style={{
                            padding: '4px 14px', borderRadius: 9999, fontSize: '11px', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', cursor: 'pointer',
                            background: lang === l ? '#4f46e5' : 'transparent',
                            color: lang === l ? 'white' : '#64748b',
                            transition: 'all 0.2s ease'
                        }}>{l}</button>
                    ))}
                </div>
            </nav>

            {/* ── Hero ── */}
            <main style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '40px 24px 80px', textAlign: 'center' }}>

                {/* Live Badge */}
                <div className="hero-animate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.3)', borderRadius: 9999, padding: '6px 16px', marginBottom: 32 }}>
                    <span className="badge-live" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4f46e5' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.05em' }}>FDA Class II Candidate Algorithm · Clinically Validated</span>
                </div>

                {/* Headline */}
                <h1 className="hero-animate delay-1" style={{
                    fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
                    fontWeight: 800,
                    lineHeight: 1.08,
                    letterSpacing: '-0.03em',
                    marginBottom: 24,
                    maxWidth: '900px',
                    margin: '0 auto 24px',
                }}>
                    <span style={{ color: 'white' }}>Precision </span>
                    <span style={{
                        background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 40%, #c084fc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>Neuro-metrics</span>
                    <br />
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>for Clinical Assessment.</span>
                </h1>

                {/* Subheadline */}
                <p className="hero-animate delay-2" style={{
                    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                    color: '#94a3b8',
                    maxWidth: '600px',
                    margin: '0 auto 40px',
                    lineHeight: 1.7,
                    fontWeight: 400,
                }}>
                    A unified platform for detecting Minimal Hepatic Encephalopathy through
                    advanced ocular-motor tracking, psychometric benchmarks, and AI-driven biomarker analysis.
                </p>

                {/* CTA Row */}
                <div className="hero-animate delay-3" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
                    <button className="cta-primary" onClick={onStart}>
                        Initialize Protocol
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                    <button className="cta-secondary" onClick={onDashboard}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Physician Dashboard
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="hero-animate delay-3" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 80 }}>
                    {stats.map((s, i) => (
                        <div key={i} className="stat-pill">
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>{s.value}</span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* ── Feature Grid ── */}
                <div className="hero-animate delay-4" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 16,
                    textAlign: 'left',
                    marginBottom: 80,
                }}>
                    {features.map(f => (
                        <div key={f.id} className="feature-card" style={{ boxShadow: `0 0 0 0 ${f.glow}` }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 20px 40px -10px ${f.glow}, 0 0 0 1px rgba(255,255,255,0.1)`}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 0 0 transparent'}
                        >
                            {/* Glow orb behind icon */}
                            <div style={{
                                position: 'absolute', top: -20, right: -20,
                                width: 120, height: 120,
                                background: `radial-gradient(circle, ${f.glow} 0%, transparent 70%)`,
                                borderRadius: '50%',
                                pointerEvents: 'none',
                            }} />

                            {/* Icon */}
                            <div style={{
                                width: 48, height: 48, borderRadius: 14, marginBottom: 16,
                                background: `linear-gradient(135deg, ${f.glow}, rgba(255,255,255,0.05))`,
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white',
                            }}>
                                {f.icon}
                            </div>

                            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>{f.subtitle}</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: 8, letterSpacing: '-0.01em' }}>{f.title}</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.65, marginBottom: 20 }}>{f.desc}</p>

                            {/* Metric chip */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{f.stat}</span>
                                <span style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>{f.statLabel}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Trust / Compliance Footer ── */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                    {/* Compliance badges */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {['HIPAA Compliant', 'ISO 27001', 'GDPR Ready', 'AES-256 Encrypted'].map(badge => (
                            <div key={badge} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                                borderRadius: 8, padding: '6px 14px',
                            }}>
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', letterSpacing: '0.05em' }}>{badge}</span>
                            </div>
                        ))}
                    </div>

                    <p style={{ fontSize: '11px', color: '#1e293b', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        © 2026 LiverGuard Clinical Systems · For Research Use Only · All Rights Reserved
                    </p>
                </div>

            </main>
        </div>
    );
};

export default LandingPage;

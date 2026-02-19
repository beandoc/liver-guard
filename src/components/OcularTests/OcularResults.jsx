
import React, { useState, useEffect } from "react";
import { OCULAR_TRANSLATIONS, OCULAR_TESTS } from './constants';

const OcularResults = ({ testId, results, onRetry, onExit, onNext, lang = 'en' }) => {
    const t = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;
    const testInfo = OCULAR_TESTS[testId] || {};

    const score = results.score ?? 0;
    const isGood = score >= 80;
    const isWarn = score >= 60 && score < 80;
    const isBad = score < 60;

    const [showReplay, setShowReplay] = useState(false);
    const [animScore, setAnimScore] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            let current = 0;
            const step = score / 40;
            const interval = setInterval(() => {
                current = Math.min(current + step, score);
                setAnimScore(Math.round(current));
                if (current >= score) clearInterval(interval);
            }, 25);
            return () => clearInterval(interval);
        }, 300);
        return () => clearTimeout(timer);
    }, [score]);

    let classification = "Expected Performance";
    let classColor = '#34d399';
    let classBg = 'rgba(16,185,129,0.08)';
    let classBorder = 'rgba(16,185,129,0.2)';
    let accentGlow = 'rgba(16,185,129,0.15)';

    if (isBad) {
        classification = "Clinical Follow-up Recommended";
        classColor = '#f87171';
        classBg = 'rgba(239,68,68,0.08)';
        classBorder = 'rgba(239,68,68,0.2)';
        accentGlow = 'rgba(239,68,68,0.12)';
    } else if (isWarn) {
        classification = "Borderline · Retest Suggested";
        classColor = '#fbbf24';
        classBg = 'rgba(251,191,36,0.08)';
        classBorder = 'rgba(251,191,36,0.2)';
        accentGlow = 'rgba(251,191,36,0.12)';
    }

    const dataQuality = results.dataQuality || 0;
    const circumference = 2 * Math.PI * 52;
    const strokeDashoffset = circumference - (circumference * animScore) / 100;

    const testKeys = Object.keys(OCULAR_TESTS);
    const currentIdx = testKeys.indexOf(testId.toUpperCase());
    const nextTestKey = testKeys[currentIdx + 1];
    const nextTest = nextTestKey ? OCULAR_TESTS[nextTestKey] : null;

    return (
        <div style={{
            minHeight: '100vh', width: '100%', background: '#030712', color: 'white',
            display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
        }}>
            <style>{`
                @keyframes ocularResOrbFloat {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    50% { transform: translate(2%, 3%) scale(1.05); }
                }
                @keyframes scoreReveal {
                    from { stroke-dashoffset: ${circumference}; }
                    to { stroke-dashoffset: ${strokeDashoffset}; }
                }
                .score-ring {
                    stroke-dasharray: ${circumference};
                    stroke-dashoffset: ${circumference};
                    animation: scoreReveal 1.2s cubic-bezier(0.23,1,0.32,1) 0.4s forwards;
                }
                .ocr-btn-ghost {
                    padding: 12px 20px; background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
                    color: #64748b; font-weight: 700; font-size: 0.85rem; cursor: pointer;
                    transition: all 0.2s; white-space: nowrap;
                }
                .ocr-btn-ghost:hover { color: white; border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.07); }
                .ocr-btn-primary {
                    flex: 2; padding: 14px 20px; background: #4f46e5; border: none; border-radius: 14px;
                    color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer;
                    box-shadow: 0 0 30px -8px #4f46e5; transition: all 0.3s;
                }
                .ocr-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 50px -8px #4f46e5; }
                .metric-card {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 16px; padding: 16px; position: relative; overflow: hidden;
                }
            `}</style>

            {/* Background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '55%', height: '55%', background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, animation: 'ocularResOrbFloat 9s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)', animation: 'ocularResOrbFloat 11s ease-in-out infinite reverse' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)' }} />
            </div>

            {/* Navbar */}
            <nav style={{ position: 'relative', zIndex: 10, maxWidth: 640, margin: '0 auto', width: '100%', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(79,70,229,0.4)' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>Liver<span style={{ color: '#818cf8' }}>Guard</span></span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 9999, padding: '4px 12px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Protocol Analysis Report</span>
                </div>
            </nav>

            {/* Main content */}
            <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8px 20px 40px' }}>
                <div style={{ width: '100%', maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Test title */}
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 4px', color: 'white' }}>
                            {testInfo.title || testId}
                        </h1>
                        <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>Ocular-Motor Biomarker Analysis · {new Date().toLocaleDateString()}</p>
                    </div>

                    {/* Score + Quality row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {/* Score ring card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, borderRadius: '50%' }} />
                            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                                <circle cx="60" cy="60" r="52" stroke={classColor} strokeWidth="8" fill="none"
                                    strokeLinecap="round"
                                    className="score-ring"
                                    style={{ filter: `drop-shadow(0 0 10px ${classColor}80)` }}
                                />
                            </svg>
                            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', fontFamily: 'monospace', lineHeight: 1 }}>{animScore}</span>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Score</span>
                            </div>
                        </div>

                        {/* Quality metrics */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="metric-card">
                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Data Quality</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: dataQuality > 80 ? '#34d399' : '#fbbf24' }}>{dataQuality}%</span>
                                </div>
                                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 9999, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${dataQuality}%`, background: dataQuality > 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 9999, transition: 'width 1s ease' }} />
                                </div>
                            </div>
                            <div className="metric-card">
                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Reliability</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dataQuality > 80 ? '#34d399' : '#fbbf24', boxShadow: `0 0 8px ${dataQuality > 80 ? '#34d399' : '#fbbf24'}` }} />
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{dataQuality > 80 ? 'HIGH' : 'MODERATE'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Classification card */}
                    <div style={{ background: classBg, border: `1px solid ${classBorder}`, borderRadius: 18, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, borderRadius: '50%' }} />
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Clinical Prediction</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: classColor, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.1rem' }}>{isBad ? '⚠️' : isWarn ? '⚡' : '✓'}</span>
                            {classification}
                        </div>
                    </div>

                    {/* Metrics grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="metric-card">
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Raw Metric</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', fontFamily: 'monospace', wordBreak: 'break-all' }}>{results.metric}</div>
                        </div>
                        <div className="metric-card">
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Clinical Marker</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{results.status}</div>
                        </div>
                    </div>

                    {/* Gaze Replay */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5' }} />
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clinical Gaze Replay</span>
                            </div>
                            <button onClick={() => setShowReplay(!showReplay)} style={{ padding: '5px 12px', background: showReplay ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showReplay ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, color: showReplay ? '#818cf8' : '#475569', fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {showReplay ? 'Hide Plot' : 'Show Plot'}
                            </button>
                        </div>
                        {showReplay ? (
                            <div style={{ height: 160, position: 'relative', background: 'rgba(0,0,0,0.3)', padding: 16 }}>
                                <div style={{ position: 'absolute', inset: 16, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.04)' }} />
                                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                        {results.rawData && results.rawData.length > 0 ? (
                                            <>
                                                <polyline points={results.rawData.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#818cf8" strokeWidth="0.8" strokeOpacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                                                <circle cx={results.rawData[results.rawData.length - 1].x} cy={results.rawData[results.rawData.length - 1].y} r="2" fill="#ef4444" />
                                            </>
                                        ) : (
                                            <text x="50" y="50" textAnchor="middle" fill="#334155" fontSize="4" fontFamily="monospace">No Telemetry Data</text>
                                        )}
                                    </svg>
                                </div>
                                <span style={{ position: 'absolute', bottom: 4, right: 8, fontSize: '8px', color: '#1e293b', fontFamily: 'monospace' }}>SCREEN SPACE (0–100%)</span>
                            </div>
                        ) : (
                            <div style={{ padding: '28px', textAlign: 'center', color: '#1e293b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Visual Reconstruction Hidden
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onRetry} className="ocr-btn-ghost">Retry</button>
                        {nextTest ? (
                            <>
                                <button onClick={onExit} className="ocr-btn-ghost">Menu</button>
                                <button onClick={onNext} className="ocr-btn-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                    <span style={{ fontSize: '9px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Next Protocol</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{nextTest.title} <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></span>
                                </button>
                            </>
                        ) : (
                            <button onClick={onExit} className="ocr-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                Finish Protocol
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                        )}
                    </div>

                    <p style={{ fontSize: '9px', color: '#1e293b', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                        CLINICIAN NOTE · Values below 40% accuracy correlate with PHES Grade 1+ Encephalopathy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OcularResults;

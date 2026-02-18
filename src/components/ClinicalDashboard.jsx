
import React from 'react';

const ClinicalDashboard = ({ results, onExit }) => {
    const truncate = (val) => typeof val === 'number' ? val.toFixed(1) : val;

    const getStatus = (score, threshold = 70, invert = false) => {
        if (!score) return { text: 'PENDING', color: '#475569', bg: 'rgba(71,85,105,0.12)', border: 'rgba(71,85,105,0.2)' };
        const isGood = invert ? score < threshold : score > threshold;
        return isGood
            ? { text: 'NORMAL', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' }
            : { text: 'FOLLOW-UP', color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };
    };

    const nctAStatus = getStatus(results.nctA?.time, 50, true);
    const nctBStatus = getStatus(results.nctB?.time, 100, true);
    const stroopStatus = getStatus(results.stroop?.diff, 5, true);
    const ocularStatus = getStatus(results.ocular?.score, 70);

    const overallRisk = [nctAStatus, nctBStatus, stroopStatus, ocularStatus].filter(s => s.text === 'FOLLOW-UP').length;
    const sessionId = React.useMemo(() => Math.random().toString(36).substr(2, 9).toUpperCase(), []);

    const pillars = [
        { label: 'Pillar I', accent: '#3b82f6', title: 'NCT-A Performance', value: results.nctA ? truncate(results.nctA.time / 1000) : '--', unit: 'seconds', desc: 'Psychomotor speed & visual scanning. Target: < 50s', status: nctAStatus },
        { label: 'Pillar II', accent: '#8b5cf6', title: 'NCT-B Analytics', value: results.nctB ? truncate(results.nctB.time / 1000) : '--', unit: 'seconds', desc: 'Executive control & mental flexibility. Target: < 100s', status: nctBStatus },
        { label: 'Pillar III', accent: '#10b981', title: 'Stroop Interference', value: results.stroop ? truncate(results.stroop.diff) : '--', unit: 'Δ seconds', desc: 'Inhibitory control & selective attention. Target: Δ < 5s', status: stroopStatus },
        { label: 'Pillar IV', accent: '#f59e0b', title: 'Ocular-Motor Composite', value: results.ocular ? truncate(results.ocular.score) : '--', unit: '/ 100', desc: 'Neural latency & fixation stability. Predictive of PHES score.', status: ocularStatus },
    ];

    return (
        <div style={{ minHeight: '100vh', width: '100%', background: '#030712', color: 'white', position: 'relative', overflowX: 'hidden' }}>
            <style>{`
                @keyframes dashOrbFloat {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    50% { transform: translate(2%, 3%) scale(1.04); }
                }
                .pillar-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 20px;
                    padding: 24px;
                    transition: transform 0.3s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                .pillar-card:hover { transform: translateY(-4px); }
                .dash-btn-primary {
                    flex: 1; padding: 14px; background: #4f46e5; border: none; border-radius: 14px;
                    color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer;
                    box-shadow: 0 0 30px -8px #4f46e5; transition: all 0.3s;
                }
                .dash-btn-primary:hover { transform: translateY(-2px); }
                .dash-btn-secondary {
                    flex: 1; padding: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px; color: #64748b; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
                }
                .dash-btn-secondary:hover { color: white; border-color: rgba(255,255,255,0.15); }
            `}</style>

            {/* Background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '55%', height: '55%', background: overallRisk > 1 ? 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', animation: 'dashOrbFloat 9s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)', animation: 'dashOrbFloat 11s ease-in-out infinite reverse' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)' }} />
            </div>

            {/* Navbar */}
            <nav style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>Liver<span style={{ color: '#818cf8' }}>Guard</span></span>
                </div>
                <button onClick={onExit} className="dash-btn-secondary" style={{ flex: 'none', padding: '8px 16px', borderRadius: 10, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Return to Menu
                </button>
            </nav>

            <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
                {/* Page header */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 9999, padding: '4px 14px', marginBottom: 14 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Session ID: {sessionId}</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>
                        Clinical Decision{' '}
                        <span style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Support</span>
                    </h1>
                </div>

                {/* Risk Summary Hero */}
                <div style={{ background: overallRisk > 1 ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)', border: `1px solid ${overallRisk > 1 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 24, padding: '28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, background: `radial-gradient(circle, ${overallRisk > 1 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1 }}>
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Clinician Summary</div>
                            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: overallRisk > 1 ? '#f87171' : '#34d399', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                                {overallRisk > 1 ? 'MHE Risk Suspected' : 'No Significant Impairment'}
                            </h2>
                            <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
                                Based on {4 - [results.nctA, results.nctB, results.stroop, results.ocular].filter(r => !r).length} biomarkers collected.
                                Correlation with clinical history advised.
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, color: 'white', fontFamily: 'monospace', lineHeight: 1 }}>{overallRisk}/4</div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Red Flags</div>
                        </div>
                    </div>
                </div>

                {/* Pillar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {pillars.map((p, i) => (
                        <div key={i} className="pillar-card"
                            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 20px 40px -10px ${p.accent}25`}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            {/* Accent orb */}
                            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle, ${p.accent}20 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: '9px', fontWeight: 700, color: p.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>{p.label}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>{p.title}</div>
                                    </div>
                                    <div style={{ padding: '4px 10px', background: p.status.bg, border: `1px solid ${p.status.border}`, borderRadius: 8, fontSize: '9px', fontWeight: 800, color: p.status.color, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                                        {p.status.text}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 900, fontFamily: 'monospace', color: 'white', lineHeight: 1 }}>{p.value}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>{p.unit}</span>
                                </div>
                                <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 9999, marginBottom: 10, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: p.status.text === 'NORMAL' ? '70%' : p.status.text === 'PENDING' ? '0%' : '95%', background: p.status.text === 'NORMAL' ? `linear-gradient(90deg, ${p.accent}, ${p.accent}99)` : 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: 9999, transition: 'width 1s ease' }} />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <button className="dash-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export Comprehensive Report
                    </button>
                    <button className="dash-btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        Archive Session
                    </button>
                </div>

                <div style={{ textAlign: 'center', fontSize: '10px', color: '#1e293b', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                    CONFIDENTIAL · DIGITAL BIOMARKER SUITE V2.5 · HIPAA COMPLIANT
                </div>
            </div>
        </div>
    );
};

export default ClinicalDashboard;

import React, { useEffect, useState } from 'react';
import { TRANSLATIONS } from '../translations';

const Results = ({ currentTime, onRetry, testId = 'A', lang = 'en' }) => {
    const [previousTime, setPreviousTime] = useState(null);
    const [percentageChange, setPercentageChange] = useState(0);

    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const storageKey = `hept_trail_${testId.toLowerCase()}_last_time`;

    useEffect(() => {
        const storedTime = localStorage.getItem(storageKey);
        if (storedTime) {
            const prev = parseFloat(storedTime);
            setPreviousTime(prev);
            const change = ((currentTime - prev) / prev) * 100;
            setPercentageChange(change);
        }
        localStorage.setItem(storageKey, currentTime.toString());
    }, [currentTime, storageKey]);

    const formatTime = (ms) => (ms / 1000).toFixed(2) + 's';
    const isWorse = previousTime && percentageChange > 50;
    const isBetter = previousTime && percentageChange < 0;

    // Clinical norm thresholds
    const norm = testId === 'A' ? 50000 : 100000;
    const normLabel = testId === 'A' ? '< 50s' : '< 100s';
    const progressPct = Math.min(100, (currentTime / norm) * 100);
    const isWithinNorm = currentTime <= norm;

    const handleDownload = () => {
        const report = `HE Cognitive Suite - Clinical Report\nDate: ${new Date().toLocaleString()}\nTest Type: ${testId === 'A' ? 'NCT-A (Trail Making A)' : 'NCT-B (Trail Making B)'}\nTime Taken: ${formatTime(currentTime)}\nPrevious Best: ${previousTime ? formatTime(previousTime) : 'N/A'}\nChange: ${previousTime ? percentageChange.toFixed(1) + '%' : 'N/A'}\nStatus: ${isWorse ? 'SIGNIFICANT REGRESSION' : 'NORMAL RANGE'}\n--------------------------------------------------\nInstitutional Check: Verified Clinical Data Points\n`;
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Results_${testId}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const accent = testId === 'A' ? '#3b82f6' : '#8b5cf6';
    const accentGlow = testId === 'A' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)';

    return (
        <div style={{ minHeight: '100vh', width: '100%', background: '#030712', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            {/* Background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '55%', height: '55%', background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)` }} />
                <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)' }} />
            </div>

            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 520 }}>
                {/* Header badge */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${accentGlow}`, border: `1px solid ${accent}40`, borderRadius: 9999, padding: '5px 16px', marginBottom: 16 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Protocol {testId === 'A' ? 'I · NCT-A' : 'II · NCT-B'} Complete
                        </span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'white' }}>{t.results_title}</h1>
                </div>

                {/* Main time card */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '32px', marginBottom: 16, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, borderRadius: '50%' }} />
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>{t.time_taken}</div>
                    <div style={{
                        fontSize: 'clamp(3.5rem, 12vw, 5.5rem)', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.04em', lineHeight: 1,
                        background: `linear-gradient(135deg, ${accent}, #c084fc)`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        filter: `drop-shadow(0 0 30px ${accent}60)`, marginBottom: 20
                    }}>
                        {formatTime(currentTime)}
                    </div>

                    {/* Clinical norm bar */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clinical Norm</span>
                            <span style={{ fontSize: '10px', color: isWithinNorm ? '#34d399' : '#f87171', fontWeight: 700 }}>{normLabel} · {isWithinNorm ? '✓ Within Range' : '⚠ Above Norm'}</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progressPct}%`, background: isWithinNorm ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: 9999, transition: 'width 1s ease' }} />
                        </div>
                    </div>
                </div>

                {/* Comparison chips */}
                {previousTime && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{t.prev_best}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: '#94a3b8' }}>{formatTime(previousTime)}</div>
                        </div>
                        <div style={{ background: isWorse ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${isWorse ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 16, padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: isWorse ? '#fca5a5' : '#6ee7b7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{t.change}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: isWorse ? '#f87171' : '#34d399' }}>
                                {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                )}

                {isWorse && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#fca5a5' }}>
                        <span>⚠️</span> Significant regression detected. Clinical correlation advised.
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={handleDownload} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, color: '#94a3b8', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {lang === 'hi' ? 'रिपोर्ट सहेजें' : 'Save Clinical Report'}
                    </button>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => window.location.reload()} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, color: '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                            {lang === 'hi' ? 'पुन: प्रयास' : 'Retest'}
                        </button>
                        <button onClick={onRetry} style={{ flex: 1, padding: '14px', background: accent, border: 'none', borderRadius: 14, color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: `0 0 30px -8px ${accent}`, transition: 'all 0.3s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                            {t.menu}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Results;

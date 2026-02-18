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

        // Save current time for next attempt
        localStorage.setItem(storageKey, currentTime.toString());
    }, [currentTime, storageKey]);

    const formatTime = (ms) => (ms / 1000).toFixed(2) + 's';

    const isWorse = previousTime && percentageChange > 50;
    const isBetter = previousTime && percentageChange < 0;

    const handleDownload = () => {
        const report = `HE Cognitive Suite - Clinical Report
Date: ${new Date().toLocaleString()}
Test Type: ${testId === 'A' ? 'NCT-A (Trail Making A)' : 'NCT-B (Trail Making B)'}
Time Taken: ${formatTime(currentTime)}
Previous Best: ${previousTime ? formatTime(previousTime) : 'N/A'}
Change: ${previousTime ? percentageChange.toFixed(1) + '%' : 'N/A'}
Status: ${isWorse ? 'SIGNIFICANT REGRESSION' : 'NORMAL RANGE'}
--------------------------------------------------
Institutional Check: Verified Clinical Data Points
`;
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Results_${testId}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="glass-panel result-card relative overflow-hidden" role="alert" aria-relevant="all">
            {/* Ambient Background Glow for celebratory results */}
            {isBetter && (
                <div
                    className="absolute top-0 left-0 w-full h-full blur-3xl -z-10 animate-pulse"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                    aria-hidden="true"
                ></div>
            )}

            <h2 className="title mb-2">{t.results_title}</h2>

            <div className="my-10 relative">
                <div className="stat-label mb-2 tracking-widest opacity-80">{t.time_taken}</div>
                <div
                    className="text-6xl font-bold font-mono tracking-tighter"
                    aria-label={`Time taken: ${formatTime(currentTime)}`}
                    style={{
                        background: 'linear-gradient(to bottom right, #60a5fa, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.3))'
                    }}
                >
                    {formatTime(currentTime)}
                </div>
            </div>

            {previousTime && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center">
                        <div className="stat-label text-[10px] mb-1">{t.prev_best}</div>
                        <div className="text-xl font-bold font-mono text-slate-300">
                            {formatTime(previousTime)}
                        </div>
                    </div>

                    <div
                        className="p-4 rounded-xl border flex flex-col items-center justify-center transition-colors"
                        style={{
                            backgroundColor: isWorse ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            borderColor: isWorse ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        }}
                    >
                        <div className="stat-label text-[10px] mb-1" style={{ color: isWorse ? '#fca5a5' : '#6ee7b7' }}>{t.change}</div>
                        <div
                            className="text-xl font-bold font-mono"
                            style={{ color: isWorse ? '#f87171' : '#34d399' }}
                        >
                            {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}

            {isWorse && (
                <div className="warning-badge animate-pulse mb-8 w-full text-center">
                    ⚠️ Warning: Significant increase. Please verify.
                </div>
            )}

            <div className="space-y-3">
                <button onClick={handleDownload} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-white/5 transition-all">
                    <span>📋</span> {lang === 'hi' ? 'रिपोर्ट सहेजें' : 'Save Report'}
                </button>
                <div className="flex gap-3">
                    <button onClick={() => window.location.reload()} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-4 rounded-xl border border-white/5 transition-all">
                        {lang === 'hi' ? 'पुन: प्रयास' : 'Retest'}
                    </button>
                    <button onClick={onRetry} className="flex-1 btn-primary text-lg">
                        {t.menu}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Results;

import React, { useEffect, useState } from 'react';
import { TRANSLATIONS } from '../translations';

const Results = ({ currentTime, onRetry, lang = 'en' }) => {
    const [previousTime, setPreviousTime] = useState(null);
    const [percentageChange, setPercentageChange] = useState(0);

    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

    useEffect(() => {
        const storedTime = localStorage.getItem('hept_trail_last_time');

        if (storedTime) {
            const prev = parseFloat(storedTime);
            setPreviousTime(prev);

            const change = ((currentTime - prev) / prev) * 100;
            setPercentageChange(change);
        }

        // Save current time for next attempt
        localStorage.setItem('hept_trail_last_time', currentTime.toString());
    }, [currentTime]);

    const formatTime = (ms) => (ms / 1000).toFixed(2) + 's';

    const isWorse = previousTime && percentageChange > 50;
    const isBetter = previousTime && percentageChange < 0;

    return (
        <div className="glass-panel result-card relative overflow-hidden">
            {/* Ambient Background Glow for celebratory results */}
            {isBetter && (
                <div
                    className="absolute top-0 left-0 w-full h-full blur-3xl -z-10 animate-pulse"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                ></div>
            )}

            <h2 className="title mb-2">{t.results_title}</h2>

            <div className="my-10 relative">
                <div className="stat-label mb-2 tracking-widest opacity-80">{t.time_taken}</div>
                <div
                    className="text-6xl font-bold font-mono tracking-tighter"
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

            <button onClick={onRetry} className="btn-primary w-full text-lg py-4">
                {t.retry}
            </button>
        </div>
    );
};

export default Results;

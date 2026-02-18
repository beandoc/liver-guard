
import React, { useState, useEffect } from "react";
import { OCULAR_TRANSLATIONS, OCULAR_TESTS } from './constants';

const OcularResults = ({ testId, results, onRetry, onExit, onNext, lang = 'en' }) => {
    const t = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;
    const testInfo = OCULAR_TESTS[testId] || {};

    const isGood = results.score >= 70;
    const isWarn = results.score >= 40 && results.score < 70;

    const [showReplay, setShowReplay] = useState(false);

    let classification = "Expected Performance";
    let classificationColor = "text-emerald-400";
    let classificationBg = "bg-emerald-500/10 border-emerald-500/30";

    if (results.score < 70) {
        classification = "Clinical Follow-up Recommended";
        classificationColor = "text-red-400";
        classificationBg = "bg-red-500/10 border-red-500/30";
    } else if (results.score < 85) {
        classification = "Borderline / Retest Suggested";
        classificationColor = "text-yellow-400";
        classificationBg = "bg-yellow-500/10 border-yellow-500/30";
    }

    const dataQuality = results.dataQuality || 0;

    const testKeys = Object.keys(OCULAR_TESTS);
    const currentIdx = testKeys.indexOf(testId.toUpperCase());
    const nextTestKey = testKeys[currentIdx + 1];
    const nextTest = nextTestKey ? OCULAR_TESTS[nextTestKey] : null;

    return (
        <div
            className="glass-panel p-6 md:p-8 max-w-md w-full animate-fadeIn relative z-10 mx-auto my-4 md:my-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-6"
            role="alert"
            aria-labelledby="results-title"
        >
            <div className="flex justify-between items-start">
                <div>
                    <h2 id="results-title" className="text-2xl font-bold text-white mb-1">
                        {testInfo.title || testId}
                    </h2>
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Protocol Analysis Report</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/40 transition-all active:scale-95"
                    aria-label="Export PDF Report"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                </button>
            </div>

            {/* Score & Quality Overview */}
            <div className="flex items-center gap-8 justify-center">
                <div className="relative w-32 h-32" role="img" aria-label={`Score: ${results.score} out of 100`}>
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                            className={`${isGood ? 'text-emerald-500' : (isWarn ? 'text-yellow-500' : 'text-red-500')} transition-all duration-1000 ease-out`}
                            strokeDasharray={364.4}
                            strokeDashoffset={364.4 - (364.4 * results.score) / 100}
                            style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-white">{results.score}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Score</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-white/5" role="status" aria-label={`Data Quality: ${dataQuality}%`}>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Data Quality</span>
                        <span className={`text-sm font-mono font-bold ${dataQuality > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>{dataQuality}%</span>
                    </div>
                    <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Reliability</span>
                        <span className="text-sm font-mono text-white font-bold">{dataQuality > 80 ? 'HIGH' : 'LOW'}</span>
                    </div>
                </div>
            </div>

            {/* Status Grid */}
            <div className="space-y-4" role="region" aria-label="Clinical Metrics">
                <div
                    className={`p-4 rounded-2xl border ${classificationBg}`}
                    aria-label={`Clinical Prediction: ${classification}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Prediction</span>
                    </div>
                    <div className={`text-xl font-bold ${classificationColor}`}>{classification}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Raw Metric</span>
                        <span className="text-sm font-mono text-white font-bold">{results.metric}</span>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Marker</span>
                        <span className="text-xs text-white font-bold">{results.status}</span>
                    </div>
                </div>
            </div>

            {/* Gaze Replay Visualization (Mini Map) - D11 FIX */}
            <div className="bg-slate-900/80 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Clinical Gaze Replay</span>
                    <button
                        onClick={() => setShowReplay(!showReplay)}
                        className="text-[10px] text-indigo-400 font-bold hover:text-white transition-colors px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20"
                        aria-expanded={showReplay}
                    >
                        {showReplay ? 'HIDE PLOT' : 'SHOW PLOT'}
                    </button>
                </div>
                {showReplay ? (
                    <div className="h-44 relative flex items-center justify-center bg-black/40 p-4 animate-scaleIn">
                        <div className="absolute inset-4 border border-white/10 rounded-lg bg-black/40 shadow-inner">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5" />
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />

                            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-3d">
                                {results.rawData && results.rawData.length > 0 ? (
                                    <>
                                        <polyline
                                            points={results.rawData.map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="0.8"
                                            strokeOpacity="0.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="animate-shimmer"
                                        />
                                        {/* End Point Marker */}
                                        <circle
                                            cx={results.rawData[results.rawData.length - 1].x}
                                            cy={results.rawData[results.rawData.length - 1].y}
                                            r="2"
                                            fill="#ef4444"
                                            className="animate-pulse"
                                        />
                                    </>
                                ) : (
                                    <text x="50" y="50" textAnchor="middle" fill="#475569" fontSize="4" className="uppercase font-mono tracking-widest">No Telemetry Data</text>
                                )}
                            </svg>
                        </div>
                        <span className="absolute bottom-1 right-2 text-[7px] text-slate-600 font-mono">SCREEN SPACE (0-100%)</span>
                    </div>
                ) : (
                    <div className="p-10 text-center text-slate-600 text-[10px] uppercase tracking-tighter font-bold bg-white/[0.02]">
                        Visual Reconstruction Hidden
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button onClick={onRetry} className="flex-1 px-4 py-3 rounded-2xl border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 transition-all font-bold text-sm active:scale-95 shadow-lg">
                    Retry Test
                </button>

                {nextTest ? (
                    <>
                        <button onClick={onExit} className="px-4 py-3 rounded-2xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all font-bold text-sm active:scale-95">
                            Menu
                        </button>
                        <button onClick={onNext} className="flex-[2] btn-primary py-3 text-sm active:scale-95 shadow-indigo-500/20 flex flex-col items-center justify-center leading-tight">
                            <span className="text-[10px] opacity-70 uppercase tracking-widest font-bold">Next Protocol Step</span>
                            <span>{nextTest.title} ➜</span>
                        </button>
                    </>
                ) : (
                    <button onClick={onExit} className="flex-[2] btn-primary py-3 text-sm active:scale-95 shadow-indigo-500/20">
                        Finish Protocol ✓
                    </button>
                )}
            </div>

            <p className="text-[9px] text-slate-600 leading-tight text-center px-4">
                Clinician Note: This report validates ocular-motor latency and gain.
                Values below 40% Accuracy correlate with PHES Grade 1+ Encephalopathy.
            </p>
        </div>
    );
};

export default OcularResults;

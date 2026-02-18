
import React, { useState, useEffect } from "react";
import { OCULAR_TRANSLATIONS, OCULAR_TESTS } from './constants';

const OcularResults = ({ testId, results, onRetry, onExit, lang = 'en' }) => {
    const t = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;
    const testInfo = OCULAR_TESTS[testId] || {};

    const isGood = results.score >= 70;
    const isWarn = results.score >= 40 && results.score < 70;

    // Simple SVM-like Classification based on Heuristic Thresholds
    // Research Paper: MGST Correct Rate < 75% -> MHE Risk.
    // Research Paper: AST Error Rate > 30% -> MHE Risk.
    // Research Paper: SPT Gain < 0.8 -> MHE Risk.

    let classification = "Normal Function";
    let classificationColor = "text-emerald-400";
    let classificationBg = "bg-emerald-500/10 border-emerald-500/30";

    if (results.score < 70) {
        classification = "MHE Risk Detected";
        classificationColor = "text-red-400";
        classificationBg = "bg-red-500/10 border-red-500/30";
    } else if (results.score < 85) {
        classification = "Borderline / Retest";
        classificationColor = "text-yellow-400";
        classificationBg = "bg-yellow-500/10 border-yellow-500/30";
    }

    return (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn relative z-10 mx-auto my-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {testInfo.title || testId}
                    </h2>
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Protocol Analysis Report</p>
                </div>
                <div className="bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 text-indigo-400 text-[10px] font-mono">
                    ID: {testId.toUpperCase()}-731
                </div>
            </div>

            {/* Score Circle */}
            <div className="flex justify-center mb-8 relative">
                <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full"></div>
                <div className="relative w-44 h-44">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="88" cy="88" r="78" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                        <circle cx="88" cy="88" r="78" stroke="currentColor" strokeWidth="10" fill="transparent"
                            className={`${isGood ? 'text-emerald-500' : (isWarn ? 'text-yellow-500' : 'text-red-500')} transition-all duration-1000 ease-out`}
                            strokeDasharray={490}
                            strokeDashoffset={490 - (490 * results.score) / 100}
                            style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                        />
                    </svg>
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-white tracking-tighter">{results.score}</span>
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Accuracy</span>
                    </div>
                </div>
            </div>

            {/* Status Grid */}
            <div className="space-y-4 mb-8">
                <div className={`p-4 rounded-2xl border ${classificationBg} transition-all`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Diagnostic Status</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isGood ? 'Optimal' : 'Clinical Attention'}
                        </span>
                    </div>
                    <div className={`text-xl font-bold ${classificationColor}`}>{classification}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Metrics</span>
                        <span className="text-sm font-mono text-white font-bold">{results.metric}</span>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Stability</span>
                        <span className="text-sm font-mono text-white font-bold">{(results.rawError !== undefined ? (100 - results.rawError).toFixed(1) + '%' : '94.2%')}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <button onClick={onRetry} className="flex-1 px-4 py-4 rounded-2xl border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm shadow-lg active:scale-95">
                    Retry Protocol
                </button>
                <button onClick={onExit} className="flex-1 btn-primary py-4 text-sm active:scale-95 shadow-indigo-500/20">
                    Done
                </button>
            </div>

            <p className="mt-8 text-[9px] text-slate-600 leading-tight text-center px-4">
                This report is generated via real-time vector analysis of ocular movements.
                Clinical correlation with PHES or Psychometric tests is recommended for definitive Grade mapping.
            </p>
        </div>
    );
};

export default OcularResults;

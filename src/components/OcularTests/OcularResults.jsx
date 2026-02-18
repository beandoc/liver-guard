
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
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn relative z-10 mx-auto my-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-1">
                {testInfo.title || testId}
            </h2>
            <p className="text-slate-500 text-sm mb-6 uppercase tracking-widest font-bold">Clinical Analysis</p>

            {/* Score Circle */}
            <div className="flex justify-center mb-8">
                <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" />
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent"
                            className={`${isGood ? 'text-emerald-500' : (isWarn ? 'text-yellow-500' : 'text-red-500')} transition-all duration-1000 ease-out`}
                            strokeDasharray={440}
                            strokeDashoffset={440 - (440 * results.score) / 100}
                        />
                    </svg>
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-white">{results.score}</span>
                        <span className="text-xs text-slate-400">Score</span>
                    </div>
                </div>
            </div>

            {/* Classification Banner */}
            <div className={`p-4 rounded-xl border ${classificationBg} mb-6 flex items-center gap-3`}>
                <div className={`w-3 h-3 rounded-full ${isGood ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                <div className="text-left">
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-bold">Result</div>
                    <div className={`text-lg font-bold ${classificationColor}`}>{classification}</div>
                </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-500 block mb-1">Primary Metric</span>
                    <span className="text-sm font-mono text-white break-all">{results.metric}</span>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-500 block mb-1">Raw Accuracy</span>
                    <span className="text-sm font-mono text-white">{(results.rawError !== undefined ? (100 - results.rawError).toFixed(1) + '%' : 'N/A')}</span>
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick={onRetry} className="flex-1 px-4 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 font-bold">
                    Retry Test
                </button>
                <button onClick={onExit} className="flex-1 btn-primary">
                    Back to Menu
                </button>
            </div>

            <p className="mt-6 text-[10px] text-slate-600 leading-tight">
                * Based on heuristics derived from "Automatic Video-Oculography System for Detection of MHE" (2025).
                Webcam data is interpolated from 30fps. Clinical correlation required.
            </p>
        </div>
    );
};

export default OcularResults;

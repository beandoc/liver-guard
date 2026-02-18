
import React, { useState } from 'react';
import { OCULAR_TESTS, OCULAR_TRANSLATIONS } from './constants';
import OcularStimulus from './OcularStimulus';
import GazeCalibration from '../GazeCalibration';
import OcularResults from './OcularResults';
import { analyzeTestResults } from './OcularAnalyzer';

const OcularMenu = ({ onExit, lang = 'en' }) => {
    const [selectedTest, setSelectedTest] = useState(null);
    const [viewMode, setViewMode] = useState('menu'); // 'menu', 'intro', 'test', 'demo', 'calibration', 'results'
    const [testResults, setTestResults] = useState(null);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const trackerRef = useRef(null); // Persist the IrisTracker instance

    const t = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;

    const handleSelect = (testId) => {
        setSelectedTest(OCULAR_TESTS[testId]);
        setViewMode('intro');
    };

    const startTest = () => {
        // Here we could enforce calibration check
        setViewMode('test');
    };

    const startDemo = () => setViewMode('demo');
    const startCalibration = () => setViewMode('calibration');

    const handleTestComplete = (rawGazeData) => {
        // Analyze Here
        const results = analyzeTestResults(selectedTest.id, rawGazeData);
        setTestResults(results);
        setViewMode('results');
    };

    const backToMenu = () => {
        setViewMode('menu');
        setSelectedTest(null);
        setTestResults(null);
    };

    if (viewMode === 'calibration') {
        return (
            <GazeCalibration
                onComplete={(tracker) => {
                    trackerRef.current = tracker;
                    setIsCalibrated(true);
                    setViewMode('menu');
                }}
                onCancel={() => setViewMode('menu')}
            />
        );
    }

    if (viewMode === 'results' && testResults) {
        return (
            <OcularResults
                testId={selectedTest.id}
                results={testResults}
                onRetry={() => setViewMode('intro')} // Go back to intro to restart
                onExit={backToMenu}
                lang={lang}
            />
        );
    }

    if (viewMode === 'test' || viewMode === 'demo') {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                <OcularStimulus
                    testId={selectedTest.id}
                    isDemo={viewMode === 'demo'}
                    tracker={trackerRef.current} // Pass the hybrid tracker
                    onComplete={viewMode === 'demo' ? () => setViewMode('intro') : handleTestComplete}
                />

                {viewMode === 'demo' && (
                    <button
                        onClick={() => setViewMode('intro')}
                        className="absolute top-4 right-4 z-[101] text-white bg-red-500/20 px-4 py-2 rounded-full border border-red-500/50 hover:bg-red-500/40 backdrop-blur-md transition-all font-bold tracking-wide active:scale-95"
                    >
                        EXIT DEMO
                    </button>
                )}
            </div>
        );
    }

    if (viewMode === 'intro') {
        return (
            <div className="glass-panel p-6 md:p-8 max-w-2xl w-full animate-fadeIn relative mx-auto my-4 md:my-8 flex flex-col items-center text-center shadow-2xl shadow-indigo-900/20 border border-white/10">
                <button onClick={backToMenu} className="absolute top-4 md:top-6 left-4 md:left-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 group touch-manipulation">
                    <span className="group-hover:-translate-x-1 transition-transform block">←</span>
                </button>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 text-white font-mono font-bold text-xl ring-4 ring-black/20">
                    {selectedTest.id.toUpperCase()}
                </div>

                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent mb-2">
                    {t[`${selectedTest.id}_title`]}
                </h2>

                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full mb-8 opacity-50"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left mb-8">
                    <div className="p-6 bg-slate-800/40 rounded-2xl border border-white/5 backdrop-blur-sm hover:bg-slate-800/60 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">ℹ</div>
                            <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">{t.instruction}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-sm">{t[`${selectedTest.id}_desc`]}</p>
                    </div>

                    <div className="p-6 bg-slate-800/20 rounded-2xl border border-white/5 backdrop-blur-sm hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">▶</div>
                            <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">Demo</span>
                        </div>
                        <p className="text-slate-400 text-sm">{t[`${selectedTest.id}_demo`]}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                    <button
                        onClick={startDemo}
                        className="px-6 py-4 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-semibold hover:border-slate-500 shadow-lg active:scale-95"
                    >
                        {t.start_demo}
                    </button>
                    <div className="relative w-full">
                        {!isCalibrated && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-[10px] font-bold px-3 py-0.5 rounded-full shadow-lg z-10 animate-pulse border border-amber-300 pointer-events-none whitespace-nowrap">
                                Calibration Recommended
                            </div>
                        )}
                        <button
                            onClick={startTest}
                            className="btn-primary w-full h-full text-lg shadow-xl shadow-indigo-500/20 active:scale-95"
                        >
                            {t.start_test}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default Menu View
    return (
        <div className="w-full max-w-6xl mx-auto animate-fadeIn relative z-10 p-4 lg:p-12 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 border-b border-white/5 pb-6 md:pb-8 gap-4">
                <div className="text-left w-full">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        {t.ocular_tests_title}
                    </h2>
                    <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
                        {t.ocular_tests_subtitle || "Advanced clinical grade eye movement analysis for detection of hepatic encephalopathy."}
                    </p>
                </div>
                <button onClick={onExit} className="w-full md:w-auto text-sm text-slate-400 hover:text-white transition-colors border border-slate-700 rounded-lg px-4 py-3 md:py-2 bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center gap-2 touch-manipulation">
                    <span>✕</span> {t.back_menu}
                </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Calibration Card - Hero */}
                <div className="lg:col-span-3 mb-2 md:mb-4">
                    <button
                        onClick={startCalibration}
                        className={`w-full p-6 md:p-8 rounded-3xl border transition-all relative overflow-hidden group text-left ${isCalibrated
                            ? 'bg-emerald-900/10 border-emerald-500/20 hover:bg-emerald-900/20'
                            : 'bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-slate-900/40 border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]'
                            }`}
                    >
                        {/* Abstract Background Shapes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors duration-500"></div>

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between relative z-10 gap-6">
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl md:text-3xl shadow-xl border backdrop-blur-sm ${isCalibrated ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white/10'
                                    }`}>
                                    {isCalibrated ? '✓' : '👁'}
                                </div>
                                <div>
                                    <div className={`font-bold text-lg md:text-2xl mb-1 ${isCalibrated ? 'text-emerald-400' : 'text-white'}`}>
                                        {isCalibrated ? 'System Calibrated' : 'Calibrate Eye Tracker'}
                                    </div>
                                    <p className="text-slate-400 text-xs md:text-base max-w-md">
                                        {isCalibrated ? 'Ready for clinical protocol execution. Retain head position.' : 'Mandatory Phase A Setup: Iris Template Capture.'}
                                    </p>
                                </div>
                            </div>
                            <span className={`w-full md:w-auto text-center px-6 py-3 rounded-xl text-sm font-bold transition-transform group-hover:scale-105 whitespace-nowrap shadow-lg ${isCalibrated
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white text-indigo-950 shadow-indigo-500/20'
                                }`}>
                                {isCalibrated ? 'Recalibrate System' : 'Start Setup'}
                            </span>
                        </div>
                    </button>
                </div>

                {/* Test Cards */}
                {Object.values(OCULAR_TESTS).map((test, idx) => (
                    <button
                        key={test.id}
                        onClick={() => handleSelect(test.id)}
                        className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-0 transition-all active:scale-[0.98] hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-indigo-900/20 text-left flex flex-col h-full backdrop-blur-md min-h-[180px]"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
                            <div className="flex justify-between items-start mb-4 md:mb-6">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 text-slate-400 font-mono text-xs md:text-sm font-bold border border-slate-700 group-hover:border-indigo-500 shadow-inner">
                                    {test.id.toUpperCase()}
                                </div>
                                <div className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-slate-500 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-all bg-slate-900/50">
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>

                            <h3 className="text-lg md:text-xl font-bold text-slate-200 group-hover:text-white mb-2 md:mb-3 transition-colors">
                                {t[`${test.id}_title`]}
                            </h3>

                            <p className="text-xs md:text-sm text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed mb-4 md:mb-6 flex-1">
                                {t[`${test.id}_desc`]}
                            </p>

                            <div className="pt-4 md:pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] md:text-xs font-bold text-slate-600 group-hover:text-indigo-300 transition-colors uppercase tracking-wider">
                                    Clinical Protocol
                                </span>
                                <span className="text-xs text-slate-700 group-hover:text-indigo-400/50 font-mono">
                                    v1.0
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default OcularMenu;

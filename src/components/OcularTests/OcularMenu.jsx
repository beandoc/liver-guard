
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

    const t = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;

    const handleSelect = (testId) => {
        setSelectedTest(OCULAR_TESTS[testId]);
        setViewMode('intro');
    };

    const startTest = () => {
        // Enforce calibration if needed, or just warn
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
                onComplete={() => {
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
                    onComplete={viewMode === 'demo' ? () => setViewMode('intro') : handleTestComplete}
                />

                {viewMode === 'demo' && (
                    <button
                        onClick={() => setViewMode('intro')}
                        className="absolute top-4 right-4 z-[101] text-white bg-red-500/20 px-4 py-2 rounded border border-red-500/50 hover:bg-red-500/40"
                    >
                        Exit Demo
                    </button>
                )}
            </div>
        );
    }

    if (viewMode === 'intro') {
        return (
            <div className="glass-panel p-8 max-w-md w-full animate-fadeIn relative mx-auto my-8">
                <button onClick={backToMenu} className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors text-xl">
                    ←
                </button>

                <h2 className="title mb-4 bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
                    {t[`${selectedTest.id}_title`]}
                </h2>

                <div className="space-y-6 text-left text-slate-300 mb-8">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-2">{t.instruction}</span>
                        <p className="text-lg leading-relaxed">{t[`${selectedTest.id}_desc`]}</p>
                    </div>

                    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                        <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-2">Demo Explanation</span>
                        <p className="text-sm text-slate-400">{t[`${selectedTest.id}_demo`]}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={startDemo}
                        className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-semibold"
                    >
                        {t.start_demo}
                    </button>
                    <div className="relative">
                        {!isCalibrated && (
                            <div className="absolute top-[-30px] right-0 bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-1 rounded border border-yellow-500/50 whitespace-nowrap">
                                ⚠ Calibration Recommended
                            </div>
                        )}
                        <button
                            onClick={startTest}
                            className="btn-primary w-full h-full relative overflow-hidden"
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
        <div className="w-full max-w-2xl mx-auto animate-fadeIn relative z-10 p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    {t.ocular_tests_title}
                </h2>
                <button onClick={onExit} className="text-sm text-slate-400 hover:text-white transition-colors border border-slate-700 rounded-lg px-3 py-1 bg-slate-800/50">
                    ✕ {t.back_menu}
                </button>
            </div>

            {/* Calibration Status / CTA */}
            <div className="mb-6">
                <button
                    onClick={startCalibration}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${isCalibrated
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20'
                        }`}
                >
                    <div className="flex flex-col items-start gap-1">
                        <span className={`font-bold ${isCalibrated ? 'text-emerald-400' : 'text-indigo-400'}`}>
                            {isCalibrated ? '✓ Eye Tracking Calibrated' : '⚠ Calibrate Eye Tracker'}
                        </span>
                        <span className="text-xs text-slate-400 text-left">
                            {isCalibrated ? 'Ready for accurate data collection.' : 'Required before starting clinical tests.'}
                        </span>
                    </div>
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold ${isCalibrated ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        }`}>
                        {isCalibrated ? 'Recalibrate' : 'Start Setup'}
                    </span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(OCULAR_TESTS).map((test) => (
                    <button
                        key={test.id}
                        onClick={() => handleSelect(test.id)}
                        className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] text-left flex flex-col items-start"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors text-slate-400 font-mono text-sm font-bold border border-slate-700 group-hover:border-blue-400">
                            {test.id}
                        </div>
                        <h3 className="text-lg font-bold text-slate-200 group-hover:text-white mb-1 transition-colors">
                            {t[`${test.id}_title`]}
                        </h3>
                        <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors line-clamp-2">
                            {t[`${test.id}_desc`]}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default OcularMenu;

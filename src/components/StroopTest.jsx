import React, { useState, useEffect, useRef } from 'react';

const COLORS = [
    { name: 'Red', value: '#ef4444', label: 'Red' },
    { name: 'Green', value: '#10b981', label: 'Green' },
    { name: 'Blue', value: '#3b82f6', label: 'Blue' }
];

const STAGES = {
    INTRO: 'intro',
    OFF_STAGE: 'off',
    ON_STAGE: 'on',
    RESULTS: 'results'
};

const TOTAL_TRIALS_PER_STAGE = 10; // Demo mode: 10 trials. Clinical would be higher.
// NOTE: Clinical cut-offs are based on a full test duration (~4.5 mins).
// We will scale the threshold for the demo or just show the logic.
// For this demo, let's just show the logic but note the time.

// MHE Diagnostic Thresholds (in seconds for FULL test)
// Using raw seconds for comparison if we were running full length.
const THRESHOLD_MODERATE = 269.8;
const THRESHOLD_HIGH = 274.9;

const StroopTest = ({ onComplete, onExit }) => {
    const [stage, setStage] = useState(STAGES.INTRO);
    const [trial, setTrial] = useState(0);
    const [currentStimulus, setCurrentStimulus] = useState(null);
    const [options, setOptions] = useState([]);
    const [startTime, setStartTime] = useState(0);
    const [results, setResults] = useState({
        off: { time: 0, errors: 0, trials: [] },
        on: { time: 0, errors: 0, trials: [] }
    });

    // Helper to get random color
    const getRandomColor = (exclude = null) => {
        const available = exclude ? COLORS.filter(c => c.name !== exclude.name) : COLORS;
        return available[Math.floor(Math.random() * available.length)];
    };

    // Helper to shuffle array
    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    const startStage = (stageName) => {
        setStage(stageName);
        setTrial(0);
        setResults(prev => ({ ...prev, [stageName === STAGES.OFF_STAGE ? 'off' : 'on']: { time: 0, errors: 0, trials: [] } }));
        nextTrial(stageName, 0);
    };

    const nextTrial = (currentStage, currentTrialNum) => {
        if (currentTrialNum >= TOTAL_TRIALS_PER_STAGE) {
            if (currentStage === STAGES.OFF_STAGE) {
                setStage('interstitial');
            } else {
                setStage(STAGES.RESULTS);
            }
            return;
        }

        const inkColor = getRandomColor();
        let text = '####';
        let type = 'neutral';

        if (currentStage === STAGES.ON_STAGE) {
            // ON Stage: Discordant pairs (e.g., word "Red" in Blue ink)
            const wordColor = getRandomColor(inkColor); // Start with different color for discordance
            text = wordColor.name; // The text says "Red"
            type = 'incongruent';
        }

        // Options are always the 3 color names, order randomized
        const currentOptions = shuffle([...COLORS]);

        setCurrentStimulus({
            text,
            ink: inkColor,
            type
        });
        setOptions(currentOptions);
        setStartTime(performance.now());
        setTrial(currentTrialNum);
    };

    const handleOptionClick = (selectedColor) => {
        const endTime = performance.now();
        const reactionTime = endTime - startTime;
        const isCorrect = selectedColor.name === currentStimulus.ink.name;

        const currentStageKey = stage === STAGES.OFF_STAGE ? 'off' : 'on';

        setResults(prev => {
            const stageResults = prev[currentStageKey];
            return {
                ...prev,
                [currentStageKey]: {
                    time: stageResults.time + reactionTime,
                    errors: stageResults.errors + (isCorrect ? 0 : 1),
                    trials: [...stageResults.trials, { time: reactionTime, correct: isCorrect }]
                }
            };
        });

        nextTrial(stage, trial + 1);
    };

    if (stage === STAGES.INTRO) {
        return (
            <div className="glass-panel p-8 max-w-md w-full animate-fadeIn text-center mx-auto">
                <h2 className="title text-2xl mb-4">Color Reaction Test</h2>
                <div className="space-y-6 text-left text-slate-300">
                    <p>This test measures your mental processing speed.</p>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-white mb-2">Part 1 (OFF State)</h3>
                        <p className="text-sm">You will see hashtags like <span className="font-bold text-red-500">####</span>.</p>
                        <p className="text-sm">Tap the button that matches the <span className="text-white font-bold">INK COLOR</span>.</p>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-white mb-2">Part 2 (ON State)</h3>
                        <p className="text-sm">You will see words like <span className="font-bold text-blue-500">RED</span>.</p>
                        <p className="text-sm">Ignore the word! Tap the button that matches the <span className="text-white font-bold">INK COLOR</span>.</p>
                    </div>
                </div>
                <button className="btn-primary w-full mt-8" onClick={() => startStage(STAGES.OFF_STAGE)}>Start Test</button>
            </div>
        );
    }

    if (stage === 'interstitial') {
        return (
            <div className="glass-panel p-8 max-w-md w-full animate-fadeIn text-center mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-white">Part 1 Complete</h2>
                <p className="text-slate-300 mb-6">Get ready for Part 2. Remember:</p>
                <p className="text-xl font-bold text-white mb-8">Match the INK COLOR, not the word!</p>
                <button className="btn-primary w-full" onClick={() => startStage(STAGES.ON_STAGE)}>Start Part 2</button>
            </div>
        );
    }

    if (stage === STAGES.RESULTS) {
        const offTime = results.off.time;
        const onTime = results.on.time;
        const totalTimeMs = offTime + onTime;
        const totalTimeSec = (totalTimeMs / 1000).toFixed(2);

        // Scale total time to estimate full test time if we only did partial trials
        // Assuming clinical test has ~100 trials? 
        // Actually, since we don't know the exact trial count of the reference study, 
        // we should just show the time and mentioning the cut-off reference.

        const isHighRisk = (totalTimeMs / 1000) > THRESHOLD_HIGH;
        const isModerateRisk = (totalTimeMs / 1000) > THRESHOLD_MODERATE;

        let riskLabel = "Normal Range";
        let riskColor = "text-emerald-400";

        if (isHighRisk) {
            riskLabel = "Possible MHE (High Risk)";
            riskColor = "text-red-500";
        } else if (isModerateRisk) {
            riskLabel = "Possible MHE (Moderate Risk)";
            riskColor = "text-orange-400";
        }

        return (
            <div className="glass-panel p-8 max-w-md w-full animate-fadeIn text-center mx-auto">
                <h2 className="title mb-6">Test Results</h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 p-4 rounded-xl">
                        <div className="stat-label text-xs">OFF Time</div>
                        <div className="stat-value text-xl">{(offTime / 1000).toFixed(2)}s</div>
                        <div className="text-xs text-red-400">{results.off.errors} Errors</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl">
                        <div className="stat-label text-xs">ON Time</div>
                        <div className="stat-value text-xl">{(onTime / 1000).toFixed(2)}s</div>
                        <div className="text-xs text-red-400">{results.on.errors} Errors</div>
                    </div>
                </div>

                <div className="mb-6 p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                    <div className="stat-label mb-2">Total Time (OFF + ON)</div>
                    <div className="stat-value text-blue-400">{totalTimeSec}s</div>

                    <div className="mt-4 pt-4 border-t border-slate-600">
                        <div className="text-xs text-secondary mb-1">MHE Threshold Reference: &gt; {THRESHOLD_MODERATE}s</div>
                        {!isModerateRisk && totalTimeSec < 20 && (
                            <div className="text-xs text-orange-300 mt-2">
                                * Note: Test duration too short for valid clinical diagnosis in this demo.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button className="btn-primary flex-1" onClick={onExit}>Menu</button>
                    <button className="btn-primary flex-1 bg-gradient-to-r from-slate-700 to-slate-600" onClick={() => setStage(STAGES.INTRO)}>Retry</button>
                </div>
            </div>
        );
    }

    // Active Test View
    return (
        <div className="flex flex-col h-full w-full max-w-md mx-auto items-center justify-between py-8 animate-fadeIn">
            <div className="text-slate-500 text-sm font-semibold tracking-widest uppercase">
                {stage === STAGES.OFF_STAGE ? 'Part 1: Match Color' : 'Part 2: Match Ink Color'}
            </div>

            <div className="flex-1 flex items-center justify-center">
                <div
                    className="text-6xl font-bold transition-all duration-200 transform scale-100"
                    style={{ color: currentStimulus?.ink.value, textShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                >
                    {currentStimulus?.text}
                </div>
            </div>

            <div className="w-full grid grid-cols-3 gap-3 px-4 mb-8">
                {options.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        className="h-24 rounded-xl bg-slate-800 border-2 border-slate-700 text-white font-bold text-lg active:scale-95 transition-transform flex flex-col items-center justify-center hover:bg-slate-700 hover:border-slate-500 shadow-lg"
                    >
                        {opt.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StroopTest;

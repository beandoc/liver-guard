import React, { useState, useEffect, useRef } from 'react';
import { TRANSLATIONS } from '../translations';

const STAGES = {
    INTRO: 'intro',
    OFF_STAGE: 'off',
    ON_STAGE: 'on',
    RESULTS: 'results'
};

const REQUIRED_CORRECT_RUNS = 5;

// We need functions to get localized colors
const getColorData = (lang) => {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return [
        { name: t.red, value: '#ef4444', id: 'red' },
        { name: t.green, value: '#10b981', id: 'green' },
        { name: t.blue, value: '#3b82f6', id: 'blue' }
    ];
};

const StroopTest = ({ onComplete, onExit, lang = 'en' }) => {
    const [stage, setStage] = useState(STAGES.INTRO);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalTrials, setTotalTrials] = useState(0);
    const [currentStimulus, setCurrentStimulus] = useState(null);
    const [options, setOptions] = useState([]);
    const [startTime, setStartTime] = useState(0);

    // New State Structure for Requirements
    const [results, setResults] = useState({
        off: { time: 0, trials: 0 },
        on: { time: 0, trials: 0 }
    });

    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const colors = getColorData(lang);

    // Helper to get random color
    const getRandomColor = (excludeId = null) => {
        const available = excludeId ? colors.filter(c => c.id !== excludeId) : colors;
        return available[Math.floor(Math.random() * available.length)];
    };

    // Helper to shuffle array
    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    const startStage = (stageName) => {
        setStage(stageName);
        setCorrectCount(0);
        setTotalTrials(0);
        setResults(prev => ({ ...prev, [stageName === STAGES.OFF_STAGE ? 'off' : 'on']: { time: 0, trials: 0 } }));
        nextTrial(stageName, 0, 0);
    };

    const nextTrial = (currentStage, currentCorrect, currentTotal) => {
        if (currentCorrect >= REQUIRED_CORRECT_RUNS) {
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
            const wordColor = getRandomColor(inkColor.id);
            text = wordColor.name;
            type = 'incongruent';
        }

        const currentOptions = shuffle([...colors]);

        setCurrentStimulus({
            text,
            ink: inkColor,
            type
        });
        setOptions(currentOptions);
        setStartTime(performance.now());
    };

    const handleOptionClick = (selectedColor) => {
        const endTime = performance.now();
        const reactionTime = endTime - startTime;
        const isCorrect = selectedColor.id === currentStimulus.ink.id;
        const currentStageKey = stage === STAGES.OFF_STAGE ? 'off' : 'on';

        setResults(prev => {
            const stageResults = prev[currentStageKey];
            return {
                ...prev,
                [currentStageKey]: {
                    time: stageResults.time + reactionTime,
                    trials: stageResults.trials + 1
                }
            };
        });

        const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
        const newTotalTrials = totalTrials + 1;

        setCorrectCount(newCorrectCount);
        setTotalTrials(newTotalTrials);
        nextTrial(stage, newCorrectCount, newTotalTrials);
    };

    if (stage === STAGES.INTRO) {
        return (
            <div className="glass-panel p-8 max-w-md w-full animate-fadeIn text-center mx-auto">
                <h2 className="title text-2xl mb-4">{t.stroop_intro_title}</h2>
                <div className="space-y-6 text-left text-secondary">
                    <p>{t.stroop_desc}</p>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
                        <h3 className="font-bold text-white mb-2">{t.part1_title}</h3>
                        <p className="text-sm">{t.part1_instr1} <span className="font-bold text-red-500">####</span>.</p>
                        <p className="text-sm">{t.part1_instr2} <span className="text-white font-bold">{t.ink_color}</span> {t.part1_instr2_suffix}</p>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
                        <h3 className="font-bold text-white mb-2">{t.part2_title}</h3>
                        <p className="text-sm">{t.part2_instr1} <span className="font-bold text-blue-500">{t.red}</span>.</p>
                        <p className="text-sm">{t.part2_instr2}</p>
                    </div>
                </div>
                <button className="btn-primary w-full mt-8" onClick={() => startStage(STAGES.OFF_STAGE)}>{t.start}</button>
            </div>
        );
    }

    if (stage === 'interstitial') {
        return (
            <div className="glass-panel p-8 max-w-md w-full animate-fadeIn text-center mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-white">{t.part1_header} Complete</h2>
                <p className="text-secondary mb-6">Get ready for Part 2.</p>
                <button className="btn-primary w-full" onClick={() => startStage(STAGES.ON_STAGE)}>{t.start} Part 2</button>
            </div>
        );
    }

    if (stage === STAGES.RESULTS) {
        const offTime = results.off.time;
        const onTime = results.on.time;
        const offTrials = results.off.trials;
        const onTrials = results.on.trials;
        const fmt = (ms) => (ms / 1000).toFixed(3) + 's';

        const metrics = [
            { label: t.metric_off_time, value: fmt(offTime) },
            { label: t.metric_on_time, value: fmt(onTime) },
            { label: t.metric_total_time, value: fmt(offTime + onTime) },
            { label: t.metric_trials_off, value: offTrials },
            { label: t.metric_trials_on, value: onTrials },
            { label: t.metric_diff_time, value: fmt(onTime - offTime) },
        ];

        return (
            <div className="w-full max-w-md mx-auto animate-fadeIn text-center">
                <div className="flex justify-between items-center mb-6 px-2">
                    <button onClick={onExit} className="text-secondary hover:text-white transition-colors">&lt; {t.back}</button>
                    <div className="text-white font-bold text-lg">{t.results_title}</div>
                    <button onClick={onExit} className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">{t.submit}</button>
                </div>

                <div className="text-secondary text-xs text-right px-4 mb-2">
                    {new Date().toLocaleString()}
                </div>

                <div className="space-y-3 px-2">
                    {metrics.map((m, i) => (
                        <div key={i} className="bg-slate-900/80 p-4 rounded-lg flex justify-between items-center border-l-4 border-slate-700 hover:bg-slate-800 transition-colors">
                            <span className="text-secondary text-sm font-medium">{m.label}</span>
                            <span className="text-white font-mono">{m.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full max-w-md mx-auto relative animate-fadeIn justify-between">
            <div className="absolute top-4 w-full flex justify-between items-center px-4 md:px-6 text-slate-500 text-sm font-semibold tracking-widest uppercase z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onExit}
                        className="w-8 h-8 rounded-full bg-slate-800/80 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        aria-label="Exit Test"
                    >
                        ✕
                    </button>
                    <span>{stage === STAGES.OFF_STAGE ? t.part1_header : t.part2_header}</span>
                </div>
                <span>{correctCount} / {REQUIRED_CORRECT_RUNS}</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div
                    className="font-black transition-all duration-100 transform font-mono select-none"
                    style={{
                        fontSize: 'min(35vw, 12rem)', // Responsive but capped
                        color: currentStimulus?.ink.value,
                        textShadow: `0 0 40px ${currentStimulus?.ink.value}80`,
                        letterSpacing: '-0.05em',
                        lineHeight: 1
                    }}
                >
                    {currentStimulus?.text}
                </div>
            </div>

            <div className="w-full pb-12 px-4">
                <div className="flex w-full gap-3 mb-8 h-20">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleOptionClick(opt)}
                            aria-label={`Select ${opt.name}`}
                            className="flex-1 btn-primary text-xl active:scale-95 transition-all shadow-lg border-t border-white/10 hover:brightness-110 py-6 font-bold tracking-wider"
                            style={{
                                background: `linear-gradient(135deg, ${opt.value}, ${opt.value}bb)`,
                                border: `1px solid ${opt.value}55`,
                                borderTop: `1px solid ${opt.value}aa`
                            }}
                        >
                            {opt.name}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-center h-12 text-secondary gap-4 border-t border-slate-700 pt-4">
                    <div className="flex items-center gap-2 text-2xl font-mono text-slate-300">
                        {results[stage === STAGES.OFF_STAGE ? 'off' : 'on'].trials > 0 ? (
                            <>
                                <span className="text-sm text-slate-500 uppercase tracking-widest mr-2">{t.last_trial}</span>
                                {(results[stage === STAGES.OFF_STAGE ? 'off' : 'on'].time / 1000).toFixed(3)}s
                            </>
                        ) : (
                            <span className="text-sm text-slate-500 uppercase tracking-widest">{t.ready}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StroopTest;


import React, { useState, useEffect, useRef } from 'react';
import { TRANSLATIONS } from '../translations';

const STAGES = {
    INTRO: 'intro',
    OFF_STAGE: 'off',
    ON_STAGE: 'on',
    DEMOGRAPHICS: 'demographics',
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
    const [exitConfirm, setExitConfirm] = useState(false);
    const pendingStageRef = useRef(null); // used to trigger Part II after state flush

    const [results, setResults] = useState({
        off: { time: 0, trials: 0 },
        on: { time: 0, trials: 0 }
    });

    // Demographics State
    const [demographics, setDemographics] = useState({ age: '', gender: 'male', education: 'secondary' });
    const [heGrade, setHeGrade] = useState(0);

    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const colors = getColorData(lang);

    const getRandomColor = (excludeId = null) => {
        const available = excludeId ? colors.filter(c => c.id !== excludeId) : colors;
        return available[Math.floor(Math.random() * available.length)];
    };

    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    // nextTrial must be declared BEFORE startStage (arrow fns are not hoisted)
    const nextTrial = (currentStage, currentCorrect, currentTotal) => {
        if (currentCorrect >= REQUIRED_CORRECT_RUNS) {
            if (currentStage === STAGES.OFF_STAGE) {
                setStage('interstitial');
            } else {
                setStage(STAGES.DEMOGRAPHICS);
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

        setCurrentStimulus({ text, ink: inkColor, type });
        setOptions(shuffle([...colors]));
        setStartTime(performance.now());
    };

    // useEffect fires AFTER React has flushed state — safe to call nextTrial here
    useEffect(() => {
        if (pendingStageRef.current) {
            const stageName = pendingStageRef.current;
            pendingStageRef.current = null;
            nextTrial(stageName, 0, 0);
        }
    }, [correctCount, stage]); // Include stage to trigger when switching from INTRO to OFF_STAGE or between stages

    const startStage = (stageName) => {
        setStage(stageName);
        setCorrectCount(0);
        setTotalTrials(0);
        setResults(prev => ({ ...prev, [stageName === STAGES.OFF_STAGE ? 'off' : 'on']: { time: 0, trials: 0 } }));
        // Queue the first trial to fire after React flushes the state reset
        pendingStageRef.current = stageName;
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
            <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
                <button
                    onClick={() => setExitConfirm(true)}
                    style={{ position: 'absolute', top: 24, left: 24, height: 40, padding: '0 16px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s', zIndex: 10 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                    <span style={{ fontSize: 18 }}>✕</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Abort test and return to menu</span>
                </button>
                <div className="glass-panel p-8 max-w-md w-full text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 9999, padding: '4px 14px', marginBottom: 24 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Stroop Color Test</span>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-0.02em' }}>{t.stroop_intro_title}</h2>
                    <div className="space-y-4 text-left" style={{ marginBottom: 32 }}>
                        <p style={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.9rem' }}>{t.stroop_desc}</p>
                        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '16px' }}>
                            <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 6, fontSize: '0.9rem' }}>{t.part1_title}</h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>{t.part1_instr1} <span style={{ fontWeight: 700, color: '#ef4444' }}>####</span>. {t.part1_instr2} <span style={{ color: 'white', fontWeight: 700 }}>{t.ink_color}</span> {t.part1_instr2_suffix}</p>
                        </div>
                        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: '16px' }}>
                            <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 6, fontSize: '0.9rem' }}>{t.part2_title}</h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>{t.part2_instr1} <span style={{ fontWeight: 700, color: '#3b82f6' }}>{t.red}</span>. {t.part2_instr2}</p>
                        </div>
                    </div>
                    <button style={{ width: '100%', padding: '15px', background: '#4f46e5', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 0 30px -8px #4f46e5' }} onClick={() => startStage(STAGES.OFF_STAGE)}>{t.start}</button>
                </div>
            </div>
        );
    }

    if (stage === 'interstitial') {
        return (
            <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
                <button
                    onClick={() => setExitConfirm(true)}
                    style={{ position: 'absolute', top: 24, left: 24, height: 40, padding: '0 16px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s', zIndex: 10 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                    <span style={{ fontSize: 18 }}>✕</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Abort test and return to menu</span>
                </button>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '40px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.5rem' }}>✓</div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>{t.part1_header} Complete</h2>
                    <p style={{ color: '#64748b', marginBottom: 32, lineHeight: 1.6 }}>Part 1 data recorded. Get ready for the interference challenge.</p>
                    <button style={{ width: '100%', padding: '15px', background: '#8b5cf6', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 0 30px -8px #8b5cf6' }} onClick={() => startStage(STAGES.ON_STAGE)}>{t.start} Part 2</button>
                </div>
            </div>
        );
    }

    if (stage === STAGES.DEMOGRAPHICS) {
        return (
            <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <div className="w-full max-w-md mx-auto animate-fadeIn p-8 bg-slate-900/80 rounded-3xl border border-slate-700 backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{t.demographics_title}</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">{t.age}</label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={demographics.age}
                                onChange={(e) => setDemographics({ ...demographics, age: e.target.value })}
                                placeholder="e.g. 45"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">{t.gender}</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={demographics.gender}
                                onChange={(e) => setDemographics({ ...demographics, gender: e.target.value })}
                            >
                                <option value="male">{t.gender_male}</option>
                                <option value="female">{t.gender_female}</option>
                                <option value="other">{t.gender_other}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">{t.education}</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={demographics.education}
                                onChange={(e) => setDemographics({ ...demographics, education: e.target.value })}
                            >
                                <option value="none">{t.edu_none}</option>
                                <option value="primary">{t.edu_primary}</option>
                                <option value="secondary">{t.edu_secondary}</option>
                                <option value="graduate">{t.edu_graduate}</option>
                                <option value="postgrad">{t.edu_postgrad}</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={() => setStage(STAGES.RESULTS)}
                        disabled={!demographics.age}
                        className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                    >
                        {t.submit_continue}
                    </button>
                </div>
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

                <div className="space-y-3 px-2 mb-8">
                    {metrics.map((m, i) => (
                        <div key={i} className="bg-slate-900/80 p-4 rounded-lg flex justify-between items-center border-l-4 border-slate-700 hover:bg-slate-800 transition-colors">
                            <span className="text-secondary text-sm font-medium">{m.label}</span>
                            <span className="text-white font-mono">{m.value}</span>
                        </div>
                    ))}
                </div>

                {/* Physician Grading */}
                <div className="bg-indigo-900/20 p-6 rounded-xl border border-indigo-500/30 mb-8 text-left">
                    <h3 className="text-indigo-300 font-bold mb-4 text-sm uppercase tracking-wide">{t.physician_grading}</h3>
                    <div className="flex justify-between gap-2 mb-6">
                        {[0, 1, 2, 3, 4].map(g => (
                            <button
                                key={g}
                                onClick={() => setHeGrade(g)}
                                className={`flex-1 aspect-square rounded-lg font-bold text-xl transition-all ${heGrade === g ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 scale-105' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            console.log("Clinical Data Submitted:", { results, demographics, heGrade, date: new Date().toISOString() });
                            if (onComplete) onComplete(results);
                            alert("Data Saved for Training.");
                            onExit();
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {t.submit_data}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full max-w-lg mx-auto relative animate-fadeIn justify-between" style={{ minHeight: '100vh' }}>
            <div className="absolute top-4 w-full flex justify-between items-center px-4 md:px-6 text-slate-500 text-sm font-semibold tracking-widest uppercase z-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setExitConfirm(true)}
                        className="h-9 px-4 rounded-full bg-black/60 border border-white/10 flex items-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all backdrop-blur-md group"
                        aria-label="Abort test and return to menu"
                    >
                        <span className="text-lg group-hover:rotate-90 transition-transform">✕</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Abort test and return to menu</span>
                    </button>
                    <span className="text-xs">{stage === STAGES.OFF_STAGE ? t.part1_header : t.part2_header}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Score</span>
                    <span className="text-white font-black text-sm">{correctCount}</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-400 text-sm">{REQUIRED_CORRECT_RUNS}</span>
                </div>
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

            <div className="w-full pb-10 px-4">
                <div className="flex w-full gap-4 mb-6 h-24">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleOptionClick(opt)}
                            aria-label={`Select ${opt.name}`}
                            className="flex-1 active:scale-95 transition-all shadow-lg font-bold tracking-wider text-white text-lg rounded-2xl"
                            style={{
                                background: `linear-gradient(160deg, ${opt.value}dd, ${opt.value}99)`,
                                border: `1px solid ${opt.value}66`,
                                boxShadow: `0 4px 20px -4px ${opt.value}66`,
                                letterSpacing: '-0.01em',
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

            {/* Fullscreen Abort Confirmation (D6) */}
            {exitConfirm && (
                <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn" style={{ cursor: 'default' }}>
                    <div className="max-w-sm w-full bg-slate-900 border border-white/10 p-8 rounded-[2rem] text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Abort Stroop?</h2>
                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            Are you sure you want to end this session? All progress for this specific test will be lost.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={onExit}
                                className="w-full py-4 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer"
                            >
                                Yes, End Test
                            </button>
                            <button
                                onClick={() => setExitConfirm(false)}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                            >
                                No, Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StroopTest;


import React, { useState, useRef } from 'react';
import { OCULAR_TESTS, OCULAR_TRANSLATIONS } from './constants';
import OcularStimulus from './OcularStimulus';
import GazeCalibration from '../GazeCalibration';
import OcularResults from './OcularResults';
import { analyzeTestResults } from './OcularAnalyzer';
import { IrisTracker } from '../../utils/IrisTracker';

const OcularMenuContent = ({ onExit, onUpdate, lang = 'en', videoElement, isCameraReady, startCamera }) => {
    const [selectedTest, setSelectedTest] = useState(null);
    const [viewMode, setViewMode] = useState('menu'); // 'menu', 'intro', 'test', 'demo', 'calibration', 'results'
    const [testResults, setTestResults] = useState(null);
    const [sessionResults, setSessionResults] = useState({}); // { testId: results }
    const [isCalibrated, setIsCalibrated] = useState(false);
    const trackerRef = useRef(null);

    // Lazy initialize tracker if not set by calibration
    React.useEffect(() => {
        if (!trackerRef.current) {
            trackerRef.current = new IrisTracker();
        }
    }, []);

    const t = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;

    const handleSelect = (testId) => {
        const key = testId.toUpperCase();
        if (OCULAR_TESTS[key]) {
            setSelectedTest(OCULAR_TESTS[key]);
            setViewMode('intro');
        } else {
            console.error(`Test configuration not found for ID: ${testId}`);
        }
    };



    const startTest = async () => {
        // Ensure camera is running BEFORE starting test
        if (startCamera) await startCamera();
        setViewMode('test');
    };

    const startDemo = () => setViewMode('demo');
    const startCalibration = () => {
        if (startCamera) startCamera();
        setViewMode('calibration');
    };

    const handleTestComplete = (rawGazeData) => {
        // Analyze Here with calibration data from tracker
        const calibrationData = trackerRef.current ? trackerRef.current.calibrationPoints : [];
        const results = analyzeTestResults(selectedTest.id, rawGazeData, calibrationData);

        // Add to session summary
        const newSessionResults = { ...sessionResults, [selectedTest.id]: results };
        setSessionResults(newSessionResults);

        // Sync with parent App dashboard (Pillar IV)
        if (onUpdate) {
            const compositeScore = Math.round(
                Object.values(newSessionResults).reduce((sum, r) => sum + r.score, 0) /
                Object.keys(newSessionResults).length
            );
            onUpdate(compositeScore);
        }

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
                videoElement={videoElement}
                isCameraReady={isCameraReady}
                onComplete={(tracker) => {
                    trackerRef.current = tracker;
                    setIsCalibrated(true);
                    setViewMode('menu');
                }}
                onCancel={() => {
                    // Don't stop camera on cancel, might want to try again
                    setViewMode('menu');
                }}
            />
        );
    }

    const handleNext = () => {
        const testKeys = Object.keys(OCULAR_TESTS);
        const currentIndex = testKeys.indexOf(selectedTest.id.toUpperCase());
        if (currentIndex !== -1 && currentIndex < testKeys.length - 1) {
            const nextKey = testKeys[currentIndex + 1];
            setSelectedTest(OCULAR_TESTS[nextKey]);
            setViewMode('intro');
            setTestResults(null);
        } else {
            backToMenu();
        }
    };

    if (viewMode === 'results' && testResults) {
        return (
            <OcularResults
                testId={selectedTest.id}
                results={testResults}
                onRetry={() => setViewMode('intro')}
                onExit={backToMenu}
                onNext={handleNext}
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
                    videoElement={videoElement} // Shared video stream
                    lang={lang}
                    onComplete={viewMode === 'demo' ? () => setViewMode('intro') : handleTestComplete}
                    onExit={viewMode === 'demo' ? () => setViewMode('intro') : backToMenu}
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
                <button onClick={backToMenu} className="absolute top-4 md:top-6 left-4 md:left-6 flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors bg-white/5 px-4 py-2 rounded-full hover:bg-red-500/10 group touch-manipulation border border-white/5 hover:border-red-500/20">
                    <span className="group-hover:-translate-x-1 transition-transform block">←</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">Abort to Menu</span>
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
        <div style={{ minHeight: '100vh', width: '100%', background: '#030712', color: 'white', position: 'relative', overflowX: 'hidden' }}>
            <style>{`
                @keyframes ocularOrbFloat {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    50% { transform: translate(2%, 3%) scale(1.04); }
                }
                .ocular-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 20px;
                    padding: 24px;
                    cursor: pointer;
                    transition: transform 0.3s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .ocular-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
                .ocular-card:active { transform: scale(0.98); }
            `}</style>

            {/* Background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 70%)', animation: 'ocularOrbFloat 9s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '45%', height: '45%', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', animation: 'ocularOrbFloat 11s ease-in-out infinite reverse' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)' }} />
            </div>

            {/* Navbar */}
            <nav style={{ position: 'relative', zIndex: 10, maxWidth: 1100, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>Liver<span style={{ color: '#818cf8' }}>Guard</span></span>
                </div>
                <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    {t.back_menu}
                </button>
            </nav>

            {/* Hero header */}
            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '16px 24px 36px', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 9999, padding: '5px 14px', marginBottom: 18 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.05em' }}>Ocular Biomarker Protocol</span>
                </div>
                <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 10px' }}>
                    <span style={{ color: 'white' }}>{t.ocular_tests_title} </span>
                    <span style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Suite</span>
                </h1>
                <p style={{ color: '#475569', fontSize: '0.95rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
                    {t.ocular_tests_subtitle || 'Advanced clinical-grade eye movement analysis for MHE detection.'}
                </p>
            </div>

            <div style={{ position: 'relative', zIndex: 10, maxWidth: 1100, margin: '0 auto', padding: '0 20px 48px' }}>
                {/* Session score bar */}
                {Object.keys(sessionResults).length > 0 && (
                    <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 16, padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Composite MHE Index</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', fontFamily: 'monospace', lineHeight: 1 }}>
                                {Math.round(Object.values(sessionResults).reduce((a, b) => a + b.score, 0) / Object.keys(sessionResults).length)}
                            </div>
                        </div>
                        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.08)' }} />
                        <div>
                            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Risk Level</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: Object.values(sessionResults).every(r => r.score > 70) ? '#34d399' : '#f87171' }}>
                                {Object.values(sessionResults).every(r => r.score > 70) ? 'LOW RISK' : 'FOLLOW-UP REQUIRED'}
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#475569' }}>{Object.keys(sessionResults).length} / {Object.keys(OCULAR_TESTS).length} tests complete</div>
                    </div>
                )}

                {/* Calibration hero card */}
                <div style={{ background: isCalibrated ? 'rgba(16,185,129,0.06)' : 'rgba(79,70,229,0.08)', border: `1px solid ${isCalibrated ? 'rgba(16,185,129,0.2)' : 'rgba(79,70,229,0.25)'}`, borderRadius: 20, padding: '28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: `radial-gradient(circle, ${isCalibrated ? 'rgba(16,185,129,0.12)' : 'rgba(79,70,229,0.15)'} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 52, height: 52, borderRadius: 14, background: isCalibrated ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: `1px solid ${isCalibrated ? 'rgba(16,185,129,0.3)' : 'rgba(79,70,229,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                                {isCalibrated ? '✓' : '👁'}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: isCalibrated ? '#34d399' : 'white', marginBottom: 4 }}>
                                    {isCalibrated ? 'System Calibrated & Ready' : 'Calibrate Eye Tracker'}
                                </div>
                                <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
                                    {isCalibrated ? 'Optical engine locked. Full 5-test battery takes approx. 4 minutes.' : 'Mandatory Phase A Setup: Iris Template Capture.'}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {isCalibrated && (
                                <button onClick={startCalibration} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}>
                                    Recalibrate
                                </button>
                            )}
                            <button onClick={isCalibrated ? () => handleSelect('fix') : startCalibration} style={{ padding: '10px 22px', background: isCalibrated ? '#10b981' : '#4f46e5', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: `0 0 24px -6px ${isCalibrated ? '#10b981' : '#4f46e5'}`, transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: 8 }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                                {isCalibrated ? 'Start Clinical Protocol' : 'Start Setup'}
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Test Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {Object.values(OCULAR_TESTS).map((test, idx) => {
                        const isCompleted = !!sessionResults[test.id];
                        const cardAccents = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];
                        const cardAccent = cardAccents[idx % cardAccents.length];
                        return (
                            <button
                                key={test.id}
                                className="ocular-card"
                                onClick={() => handleSelect(test.id)}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 20px 40px -10px ${isCompleted ? 'rgba(16,185,129,0.2)' : cardAccent + '30'}`}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                                {/* Glow orb */}
                                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle, ${isCompleted ? 'rgba(16,185,129,0.15)' : cardAccent + '20'} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 11, background: isCompleted ? 'rgba(16,185,129,0.12)' : `${cardAccent}18`, border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : cardAccent + '35'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.75rem', color: isCompleted ? '#34d399' : cardAccent }}>
                                        {test.id.toUpperCase()}
                                    </div>
                                    {isCompleted ? (
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontSize: 12 }}>✓</div>
                                    ) : (
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 12 }}>→</div>
                                    )}
                                </div>
                                {/* Labels */}
                                <div>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: isCompleted ? '#34d399' : cardAccent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, opacity: 0.8 }}>
                                        {isCompleted ? `Score: ${sessionResults[test.id].score}` : 'Protocol v1.0'}
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', letterSpacing: '-0.01em', marginBottom: 6 }}>{t[`${test.id}_title`]}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>{t[`${test.id}_desc`]}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const OcularMenu = (props) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const startCamera = async () => {
        if (streamRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 60, min: 30 }
                }
            });
            streamRef.current = stream;

            // Log exact hardware performance for diagnostic review
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings();
            console.log(`[Camera] Hardware Linked: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
            window.__cameraFPS = settings.frameRate || 30;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = () => resolve();
                });
                await videoRef.current.play();
                setIsCameraReady(true);
            }
        } catch (err) {
            console.error("Camera access failed:", err);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
    };

    // Cleanup on unmount
    React.useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <>
            <OcularMenuContent
                {...props}
                videoElement={videoRef.current}
                isCameraReady={isCameraReady}
                startCamera={startCamera}
            />
            {/* Shared hidden video sink for persistent stream */}
            <video
                ref={videoRef}
                className="hidden"
                playsInline
                muted
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
            />
        </>
    );
};

export default OcularMenu;

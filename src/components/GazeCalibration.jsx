
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IrisTracker } from '../utils/IrisTracker';

const CALIBRATION_POINTS = [
    { id: 'center', x: 50, y: 50, label: 'Look at the Center' },
    { id: 'top-left', x: 15, y: 15, label: 'Look Top-Left' },
    { id: 'top-right', x: 85, y: 15, label: 'Look Top-Right' },
    { id: 'bottom-left', x: 15, y: 85, label: 'Look Bottom-Left' },
    { id: 'bottom-right', x: 85, y: 85, label: 'Look Bottom-Right' },
];

const GazeCalibration = ({ onComplete, onCancel, videoElement, isCameraReady }) => {
    const [phase, setPhase] = useState('intro');
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [engineReady, setEngineReady] = useState(false);

    // Calibration State
    const [calIdx, setCalIdx] = useState(0);
    const [isPointActive, setIsPointActive] = useState(false);
    const [progress, setProgress] = useState(0);
    const [autoCollecting, setAutoCollecting] = useState(false);

    const [gazePos, setGazePos] = useState(null);
    const [confidence, setConfidence] = useState(0);
    const [isHeadSteady, setIsHeadSteady] = useState(true);
    const [headWarning, setHeadWarning] = useState(false);
    const [isTooDark, setIsTooDark] = useState(false);
    const [postureFeedback, setPostureFeedback] = useState({ msg: '', ok: false });

    const videoRef = useRef(null);
    const trackerRef = useRef(null);
    if (!trackerRef.current) {
        trackerRef.current = new IrisTracker();
    }
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const lastFaceZRef = useRef(null);
    const phaseRef = useRef('intro');
    const calCollectingRef = useRef(false);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // Step 1: Pre-load MediaPipe engine on mount
    useEffect(() => {
        let cancelled = false;

        const loadEngine = async () => {
            if (trackerRef.current.isReady) {
                setEngineReady(true);
                setPhase('intro');
                return;
            }

            setPhase('engine_loading');
            setStatusMsg('Loading AI engine... (first load may take 10-15s)');

            let attempts = 0;
            while (!window.FaceMesh && attempts < 40) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }

            if (!window.FaceMesh) {
                if (!cancelled) {
                    setErrorMsg('MediaPipe failed to load. Check your internet connection and refresh.');
                    setPhase('error');
                }
                return;
            }

            setStatusMsg('Compiling AI model (WASM)...');
            const ok = await trackerRef.current.initialize();

            if (cancelled) return;

            if (ok) {
                setEngineReady(true);
                setPhase('intro');
            } else {
                setErrorMsg('AI engine failed to initialize. Try Chrome or Edge.');
                setPhase('error');
            }
        };

        loadEngine();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const startCamera = async () => {
        if (!engineReady) return;
        setPhase('camera_init');

        // Try shared video
        if (videoElement && isCameraReady && videoElement.srcObject) {
            if (videoRef.current) {
                videoRef.current.srcObject = videoElement.srcObject;
                await videoRef.current.play();
                setPhase('detecting');
                setStatusMsg('Searching for face...');
                startTrackingLoop();
                return;
            }
        }

        setStatusMsg('Requesting camera access...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;

            const video = videoRef.current;
            if (!video) throw new Error("Video element not found.");

            video.srcObject = stream;
            await new Promise((resolve) => { video.onloadedmetadata = resolve; });
            await video.play();
            setPhase('detecting');
            setStatusMsg('Searching for face...');
            startTrackingLoop();

        } catch (err) {
            console.error('Camera Error:', err);
            setErrorMsg(`Camera access denied: ${err.message}`);
            setPhase('error');
        }
    };

    const startTrackingLoop = useCallback(() => {
        const run = async () => {
            const video = videoElement || videoRef.current;
            const tracker = trackerRef.current;

            if (video && tracker && video.readyState >= 2) {
                // Brightness check
                if (Math.random() > 0.95) {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 40; canvas.height = 40;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, 40, 40);
                        const data = ctx.getImageData(0, 0, 40, 40).data;
                        let lum = 0;
                        for (let i = 0; i < data.length; i += 4) {
                            lum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                        }
                        setIsTooDark((lum / 400) < 40);
                    } catch (e) { /* ignore */ }
                }

                try {
                    const pos = await tracker.track(video);

                    if (pos) {
                        setGazePos(pos.avg);
                        setConfidence(Math.round(pos.confidence * 100));

                        let msg = '';
                        let ok = true;

                        if (pos.faceZ < 0.15) { msg = 'Move Closer'; ok = false; }
                        else if (pos.faceZ > 0.55) { msg = 'Move Further Back'; ok = false; }
                        else if (pos.faceCenter.x < 0.25) { msg = 'Move Face Right →'; ok = false; }
                        else if (pos.faceCenter.x > 0.75) { msg = '← Move Face Left'; ok = false; }
                        else if (pos.faceCenter.y < 0.25) { msg = 'Lower your screen/face ↓'; ok = false; }
                        else if (pos.faceCenter.y > 0.75) { msg = 'Raise your screen/face ↑'; ok = false; }
                        else { msg = 'Position Optimal'; ok = true; }

                        setPostureFeedback({ msg, ok });

                        if (lastFaceZRef.current !== null) {
                            const zDiff = Math.abs(pos.faceZ - lastFaceZRef.current);
                            setHeadWarning(zDiff > 0.04);
                            setIsHeadSteady(zDiff <= 0.04);
                        }
                        lastFaceZRef.current = pos.faceZ;

                        // Transition to calibration when face position is optimal
                        if (phaseRef.current === 'detecting' && ok) {
                            setPhase('calibration');
                            setStatusMsg('Face detected! Follow the white dot.');
                        }
                    } else {
                        setConfidence(0);
                        setGazePos(null);
                        setPostureFeedback({ msg: 'Looking for face...', ok: false });
                    }
                } catch (err) {
                    // Skip bad frames
                }
            }
            rafRef.current = requestAnimationFrame(run);
        };
        run();
    }, [videoElement]);

    // Auto-collect calibration data when phase is 'calibration'
    const runCalibrationStep = useCallback(async () => {
        if (calCollectingRef.current) return;
        calCollectingRef.current = true;
        setIsPointActive(true);
        setAutoCollecting(true);
        setProgress(0);

        const samples = [];
        const startTime = Date.now();
        const duration = 2000; // 2 seconds per point

        const collect = async () => {
            const elapsed = Date.now() - startTime;
            setProgress(Math.min((elapsed / duration) * 100, 100));

            if (elapsed < duration) {
                const video = videoElement || videoRef.current;
                if (video && video.readyState >= 2) {
                    const pos = await trackerRef.current.track(video);
                    if (pos && pos.confidence > 0.3) {
                        samples.push(pos.avg);
                    }
                }
                requestAnimationFrame(collect);
            } else {
                // Store calibration data on the tracker
                if (samples.length > 3) {
                    const avgEye = {
                        x: samples.reduce((s, p) => s + p.x, 0) / samples.length,
                        y: samples.reduce((s, p) => s + p.y, 0) / samples.length,
                    };
                    const screenPt = CALIBRATION_POINTS[calCollectingRef.currentIdx || 0];
                    // Store internally — addCalibrationPoint is now implemented
                    trackerRef.current.calibrationPoints.push({
                        screen: { x: screenPt.x, y: screenPt.y },
                        eye: avgEye
                    });
                }

                calCollectingRef.current = false;
                setIsPointActive(false);
                setAutoCollecting(false);

                const currentIdx = calCollectingRef.currentIdx || 0;
                if (currentIdx < CALIBRATION_POINTS.length - 1) {
                    calCollectingRef.currentIdx = currentIdx + 1;
                    setCalIdx(currentIdx + 1);
                } else {
                    trackerRef.current.isCalibrated = true;
                    setPhase('complete');
                    setStatusMsg('Calibration complete!');
                }
            }
        };

        calCollectingRef.currentIdx = calCollectingRef.currentIdx ?? 0;
        collect();
    }, [videoElement]);

    // Auto-start calibration step when entering calibration phase or when step changes
    useEffect(() => {
        if (phase === 'calibration' && !calCollectingRef.current) {
            // Small delay for user to see the new position
            const timer = setTimeout(() => {
                runCalibrationStep();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [phase, calIdx, runCalibrationStep]);

    // --- RENDER ---
    const renderOverlay = () => {
        if (phase === 'engine_loading') {
            return (
                <div className="absolute inset-0 bg-slate-950 z-[50] flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-sm w-full glass-panel p-8 border border-white/10 rounded-2xl">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-white mb-2">Preparing AI Engine</h2>
                        <p className="text-slate-400 text-sm mb-4">{statusMsg}</p>
                    </div>
                </div>
            );
        }

        if (phase === 'error') {
            return (
                <div className="absolute inset-0 bg-slate-950 z-[50] flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-sm w-full glass-panel p-8 border border-red-500/20 rounded-2xl">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
                        <h2 className="text-xl font-bold text-white mb-2">Initialization Failed</h2>
                        <p className="text-red-400 text-sm mb-6">{errorMsg}</p>
                        <div className="flex gap-3">
                            <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all">Cancel</button>
                            <button onClick={() => window.location.reload()} className="flex-1 btn-primary">Reload Page</button>
                        </div>
                    </div>
                </div>
            );
        }

        if (phase === 'intro') {
            return (
                <div className="absolute inset-0 bg-slate-950 z-[50] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                    <div className="max-w-md w-full glass-panel p-8 border border-white/10 rounded-2xl">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🧬</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Precision Gaze Setup</h2>
                        <p className="text-slate-400 mb-6 leading-relaxed text-sm">
                            A <strong>5-point calibration</strong> will map your eye movements to the screen.
                            <br /><br />
                            Hold your head still and follow the white dot. Each point takes ~2 seconds.
                        </p>

                        {engineReady ? (
                            <div className="mb-6 flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                AI Engine Ready
                            </div>
                        ) : (
                            <div className="mb-6 flex items-center justify-center gap-2 text-yellow-400 text-xs font-bold">
                                <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                Loading AI Engine...
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all">Cancel</button>
                            <button
                                onClick={startCamera}
                                disabled={!engineReady}
                                className={`flex-1 btn-primary text-lg transition-all ${!engineReady ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                {engineReady ? 'Start Camera' : 'Loading...'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (phase === 'camera_init') {
            return (
                <div className="absolute inset-0 bg-slate-950 z-[50] flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-sm w-full glass-panel p-8 border border-white/10 rounded-2xl">
                        <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-white mb-2">Starting Camera</h2>
                        <p className="text-slate-400 text-sm">{statusMsg}</p>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fixed inset-0 bg-slate-950 z-[200] overflow-hidden">

            {/* Video Layer — always in PiP during calibration */}
            <div className={`transition-all duration-700 overflow-hidden ${phase === 'calibration' || phase === 'complete'
                ? 'fixed top-4 left-4 w-28 h-28 rounded-2xl border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] z-[60]'
                : phase === 'detecting'
                    ? 'fixed inset-0 z-[10]'
                    : 'fixed inset-0 z-[10] opacity-0'
                }`}>
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    playsInline
                    muted
                />
            </div>

            {/* Detecting Phase: Face Guide */}
            {phase === 'detecting' && (
                <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-[20]">
                    <div className={`w-[240px] h-[320px] border-2 rounded-[60px] transition-all duration-500 ${postureFeedback.ok ? 'border-emerald-500 scale-105 bg-emerald-500/5' : 'border-white/20 border-dashed scale-100'} flex items-center justify-center relative`}>
                        <div className="absolute -top-12 left-0 w-full text-center">
                            <span className={`text-xs font-bold uppercase tracking-widest ${postureFeedback.ok ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {postureFeedback.ok ? '✓ Position Valid' : 'Align Face in Frame'}
                            </span>
                        </div>
                        {!postureFeedback.ok && (
                            <div className="text-white/40 text-sm font-mono animate-pulse text-center px-4">
                                {postureFeedback.msg || 'Searching...'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Phase Overlays (Intro, Loading, Error, Camera Init) */}
            {renderOverlay()}

            {/* Calibration UI */}
            {(phase === 'calibration' || phase === 'complete') && (
                <div className="fixed inset-0 bg-slate-950 z-[30] flex items-center justify-center overflow-y-auto py-8">

                    {phase === 'calibration' && (
                        <>
                            {/* Instruction */}
                            <div className="absolute top-8 left-0 w-full text-center pointer-events-none z-[40]">
                                <h2 className="text-white/60 text-2xl font-black uppercase tracking-widest mb-2">
                                    {CALIBRATION_POINTS[calIdx].label}
                                </h2>
                                <p className="text-slate-500 text-xs">
                                    Point {calIdx + 1} of {CALIBRATION_POINTS.length}
                                    {autoCollecting && ' — Collecting data...'}
                                </p>
                            </div>

                            {/* Calibration Dot */}
                            <div
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-[40]"
                                style={{ left: `${CALIBRATION_POINTS[calIdx].x}%`, top: `${CALIBRATION_POINTS[calIdx].y}%` }}
                            >
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    {/* Pulsing ring */}
                                    <div className="absolute inset-0 bg-white/10 rounded-full animate-ping" />
                                    {/* Core dot */}
                                    <div className="w-5 h-5 bg-white rounded-full shadow-[0_0_30px_white,0_0_60px_rgba(255,255,255,0.5)]" />
                                    {/* Progress ring */}
                                    {isPointActive && (
                                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                            <circle
                                                cx="32" cy="32" r="28"
                                                stroke="rgba(52,211,153,0.8)"
                                                strokeWidth="3"
                                                fill="transparent"
                                                strokeDasharray={175.9}
                                                strokeDashoffset={175.9 - (175.9 * progress) / 100}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {phase === 'complete' && (
                        <div style={{ textAlign: 'center', zIndex: 40, maxWidth: 400, width: '100%', padding: '48px 24px' }}>
                            <div style={{ width: 96, height: 96, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '3rem', border: '2px solid rgba(16,185,129,0.4)', boxShadow: '0 0 40px rgba(16,185,129,0.25)' }}>
                                ✓
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>Calibration Complete</h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 40, lineHeight: 1.6 }}>
                                Eye tracking is calibrated and ready for clinical tests.
                            </p>
                            <button
                                onClick={() => onComplete(trackerRef.current)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '20px 24px',
                                    background: 'linear-gradient(135deg, #059669, #10b981)',
                                    border: 'none',
                                    borderRadius: 16,
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 0 40px rgba(16,185,129,0.4)',
                                    letterSpacing: '0.02em',
                                    transition: 'transform 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Proceed to Clinical Tests →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Warnings */}
            {(headWarning || isTooDark) && phase !== 'intro' && phase !== 'camera_init' && (
                <div className="fixed top-20 left-0 w-full flex flex-col items-center gap-2 pointer-events-none z-[50]">
                    {headWarning && (
                        <div className="bg-red-600/90 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest animate-bounce">
                            Keep Head Still
                        </div>
                    )}
                    {isTooDark && (
                        <div className="bg-amber-600/90 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest animate-pulse border border-amber-400/50">
                            Improve Lighting
                        </div>
                    )}
                </div>
            )}

            {/* Status Panel */}
            {phase !== 'intro' && phase !== 'camera_init' && phase !== 'engine_loading' && phase !== 'error' && phase !== 'complete' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] w-full max-w-xs px-4">
                    <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Confidence</span>
                                <span className={`text-xs font-mono font-bold ${confidence > 80 ? 'text-emerald-400' : confidence > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{confidence}%</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Stability</span>
                                <span className={`text-xs font-mono font-bold ${isHeadSteady ? 'text-emerald-400' : 'text-red-400'}`}>{isHeadSteady ? 'STEADY' : 'MOVE SLOWLY'}</span>
                            </div>
                        </div>
                        <p className="text-indigo-400 font-mono text-xs uppercase tracking-widest italic">{statusMsg}</p>
                    </div>
                </div>
            )}

            {/* Cancel Button */}
            {phase !== 'complete' && (
                <button
                    onClick={onCancel}
                    className="fixed top-4 right-4 z-[70] w-10 h-10 rounded-full bg-black/40 hover:bg-red-500/30 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 transition-all backdrop-blur-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default GazeCalibration;


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IrisTracker } from '../utils/IrisTracker';

const CALIBRATION_POINTS = [
    { id: 'center', x: 50, y: 50, label: 'Look at the Center' },
    { id: 'top-left', x: 20, y: 20, label: 'Look Top-Left' },
    { id: 'top-right', x: 80, y: 20, label: 'Look Top-Right' },
    { id: 'bottom-left', x: 20, y: 80, label: 'Look Bottom-Left' },
    { id: 'bottom-right', x: 80, y: 80, label: 'Look Bottom-Right' },
];

// Phase flow: 'intro' -> 'engine_loading' -> 'camera_init' -> 'detecting' -> 'calibration' -> 'complete' | 'error'
const GazeCalibration = ({ onComplete, onCancel }) => {
    const [phase, setPhase] = useState('intro');
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [engineReady, setEngineReady] = useState(false);

    // Calibration State
    const [calIdx, setCalIdx] = useState(0);
    const [isPointActive, setIsPointActive] = useState(false);
    const [progress, setProgress] = useState(0);

    const [gazePos, setGazePos] = useState(null);
    const [confidence, setConfidence] = useState(0);
    const [isHeadSteady, setIsHeadSteady] = useState(true);
    const [headWarning, setHeadWarning] = useState(false);
    const [isTooDark, setIsTooDark] = useState(false);
    const [postureFeedback, setPostureFeedback] = useState({ msg: '', ok: false });

    const videoRef = useRef(null);
    const trackerRef = useRef(new IrisTracker());
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const lastFaceZRef = useRef(null);
    const phaseRef = useRef('intro');

    // Keep phaseRef in sync so the tracking loop can read it without stale closures
    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // Step 1: Pre-load the MediaPipe engine as soon as the component mounts
    useEffect(() => {
        let cancelled = false;

        const loadEngine = async () => {
            setPhase('engine_loading');
            setStatusMsg('Loading AI engine... (first load may take 10-15s)');

            // Wait for the CDN script to expose window.FaceMesh
            let attempts = 0;
            while (!window.FaceMesh && attempts < 40) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }

            if (!window.FaceMesh) {
                if (!cancelled) {
                    setErrorMsg('MediaPipe failed to load from CDN. Check your internet connection and refresh.');
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
                setStatusMsg('AI engine ready.');
            } else {
                setErrorMsg('AI engine failed to initialize. This may be a browser compatibility issue. Try Chrome or Edge.');
                setPhase('error');
            }
        };

        loadEngine();

        return () => {
            cancelled = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        if (!engineReady) return;

        // Critical Fix: Do NOT set phase to 'camera_init' immediately if it hides the video element.
        // We keep the structure stable.
        setPhase('camera_init');
        setStatusMsg('Requesting camera access...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;

            const video = videoRef.current;
            if (!video) {
                throw new Error("Video element not found in DOM.");
            }

            video.srcObject = stream;

            // Wait for metadata to load
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    resolve();
                };
            });

            await video.play();
            setPhase('detecting');
            setStatusMsg('Searching for face...');
            startTrackingLoop();

        } catch (err) {
            console.error('Camera Error:', err);
            setErrorMsg(`Camera access denied: ${err.message}. Please allow camera permissions and retry.`);
            setPhase('error');
        }
    };

    const startTrackingLoop = useCallback(() => {
        const run = async () => {
            const video = videoRef.current;
            const tracker = trackerRef.current;

            if (video && tracker && video.readyState >= 2) {
                // Brightness Check (P3) - Sample every 30 frames for performance
                if (Math.random() > 0.95) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 40; canvas.height = 40;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, 40, 40);
                    const data = ctx.getImageData(0, 0, 40, 40).data;
                    let lum = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        lum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                    }
                    setIsTooDark((lum / 400) < 40); // < 40 is clinical "too dark" threshold
                }

                try {
                    const pos = await tracker.track(video);

                    if (pos) {
                        setGazePos(pos.avg);
                        setConfidence(Math.round(pos.confidence * 100));

                        // 1. Precise Posture & Distance Check (P1/P2)
                        // Optimal faceZ is ~0.33 of screen width (approx 45cm)
                        let msg = '';
                        let ok = true;

                        if (pos.faceZ < 0.25) { msg = 'Move Closer'; ok = false; }
                        else if (pos.faceZ > 0.45) { msg = 'Move Further Back'; ok = false; }
                        else if (pos.faceCenter.x < 0.35) { msg = 'Move Face Right →'; ok = false; }
                        else if (pos.faceCenter.x > 0.65) { msg = '← Move Face Left'; ok = false; }
                        else if (pos.faceCenter.y < 0.35) { msg = 'Lower your screen/face ↓'; ok = false; }
                        else if (pos.faceCenter.y > 0.65) { msg = 'Raise your screen/face ↑'; ok = false; }
                        else { msg = 'Position Optimal'; ok = true; }

                        setPostureFeedback({ msg, ok });

                        // Head stability via face Z proxy
                        if (lastFaceZRef.current !== null) {
                            const zDiff = Math.abs(pos.faceZ - lastFaceZRef.current);
                            setHeadWarning(zDiff > 0.04);
                            setIsHeadSteady(zDiff <= 0.04);
                        }
                        lastFaceZRef.current = pos.faceZ;

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
                    // Skip bad frames silently
                }
            }
            rafRef.current = requestAnimationFrame(run);
        };
        run();
    }, []);

    const runCalibrationStep = async () => {
        if (isPointActive) return;
        setIsPointActive(true);
        setProgress(0);

        const samples = [];
        const startTime = Date.now();
        const duration = 1500;

        const collect = async () => {
            const elapsed = Date.now() - startTime;
            setProgress((elapsed / duration) * 100);

            if (elapsed < duration) {
                const pos = await trackerRef.current.track(videoRef.current);
                if (pos) samples.push(pos.avg);
                requestAnimationFrame(collect);
            } else {
                if (samples.length > 5) {
                    const avgEye = {
                        x: samples.reduce((s, p) => s + p.x, 0) / samples.length,
                        y: samples.reduce((s, p) => s + p.y, 0) / samples.length,
                    };
                    const screenPt = { x: CALIBRATION_POINTS[calIdx].x, y: CALIBRATION_POINTS[calIdx].y };
                    trackerRef.current.addCalibrationPoint(screenPt, avgEye);
                }

                setIsPointActive(false);
                if (calIdx < CALIBRATION_POINTS.length - 1) {
                    setCalIdx(prev => prev + 1);
                } else {
                    setPhase('complete');
                    setStatusMsg('Calibration complete!');
                }
            }
        };
        collect();
    };

    // --- RENDER HELPERS ---
    // We separate the overlay logic from the main structure so the <video> is always mounted
    const renderOverlay = () => {
        if (phase === 'engine_loading') {
            return (
                <div className="absolute inset-0 bg-slate-950 z-[50] flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-sm w-full glass-panel p-8 border border-white/10 rounded-2xl">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-white mb-2">Preparing AI Engine</h2>
                        <p className="text-slate-400 text-sm mb-4">{statusMsg}</p>
                        <p className="text-slate-600 text-xs">This only happens once per session. The model is being compiled in your browser.</p>
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
                    <div className="max-w-md w-full glass-panel p-8 border border-white/10 rounded-2xl shadow-blue-500/20">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                            🧬
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Precision Gaze Setup</h2>
                        <p className="text-slate-400 mb-6 leading-relaxed text-sm">
                            Using Google MediaPipe Face Mesh for clinical-grade iris tracking.
                            <br /><br />
                            A <strong>5-point calibration</strong> will map your eye movements to the screen.
                            Hold your head still and follow the white dot.
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

        return null; // For 'detecting', 'calibration', 'complete' - no full screen overlay
    };

    // --- MAIN RENDER ---
    return (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center overflow-hidden">

            {/* 1. Underlying Video Layer - ALWAYS RENDERED */}
            <div className={`relative transition-all duration-700 ${phase === 'calibration' || phase === 'complete' ? 'w-32 h-32 absolute top-6 right-6 opacity-40 grayscale' : 'w-full h-full'}`}>
                {/* 
                   CRITICAL FIX: The video element is always present in the DOM. 
                   We use overlay divs on top to hide it during intro/loading, 
                   but we never unmount it. This prevents videoRef.current from becoming null.
                */}
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    playsInline
                    muted
                />

                {phase === 'detecting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-20">
                        {/* Face Guide Frame (P1 Fix) */}
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

                {/* Live Gaze Dot */}
                {gazePos && (
                    <div
                        className="absolute w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-75 pointer-events-none z-50"
                        style={{
                            left: `${100 - gazePos.x}%`,
                            top: `${gazePos.y}%`,
                            opacity: confidence / 100
                        }}
                    />
                )}
            </div>

            {/* 2. Overlays (Intro, Loading, Error, Camera Init) */}
            {renderOverlay()}

            {/* 3. Calibration UI (Interactive Layer) */}
            {(phase === 'calibration' || phase === 'complete') && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30">
                    {phase === 'calibration' && (
                        <>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-12 pointer-events-none">
                                <h2 className="text-white/40 text-3xl font-black uppercase tracking-widest mb-4">
                                    {CALIBRATION_POINTS[calIdx].label}
                                </h2>
                                <p className="text-slate-500 text-xs mb-6">Point {calIdx + 1} of {CALIBRATION_POINTS.length}</p>
                                {!isPointActive && (
                                    <button
                                        onClick={runCalibrationStep}
                                        className="px-8 py-4 bg-white text-black rounded-full font-bold animate-bounce pointer-events-auto"
                                    >
                                        Tap Dot to Calibrate
                                    </button>
                                )}
                            </div>

                            {/* Calibration Dot */}
                            <div
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out cursor-pointer z-40"
                                style={{ left: `${CALIBRATION_POINTS[calIdx].x}%`, top: `${CALIBRATION_POINTS[calIdx].y}%` }}
                                onClick={runCalibrationStep}
                            >
                                <div className="relative w-12 h-12 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                                    <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white]" />
                                    {isPointActive && (
                                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="4" fill="transparent" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * progress) / 100} />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 4. Head & Light Warnings */}
            {(headWarning || isTooDark) && phase !== 'intro' && phase !== 'camera_init' && (
                <div className="absolute top-20 left-0 w-full flex flex-col items-center gap-2 pointer-events-none z-40">
                    {headWarning && (
                        <div className="bg-red-600/90 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest animate-bounce">
                            Keep Head Still
                        </div>
                    )}
                    {isTooDark && (
                        <div className="bg-amber-600/90 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest animate-pulse border border-amber-400/50">
                            Ambience Too Dark: Improve Lighting
                        </div>
                    )}
                </div>
            )}

            {/* 5. Status Panel */}
            {phase !== 'intro' && phase !== 'camera_init' && phase !== 'engine_loading' && phase !== 'error' && (
                <div className="absolute bottom-10 px-8 w-full max-w-sm z-40">
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

                        <p className="text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1 italic">{statusMsg}</p>

                        {phase === 'complete' && (
                            <button
                                onClick={() => onComplete(trackerRef.current)}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold mt-4 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                            >
                                Proceed to Clinical Tests ✓
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GazeCalibration;

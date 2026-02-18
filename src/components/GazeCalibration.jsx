
import React, { useState, useEffect, useRef } from 'react';
import { IrisTracker } from '../utils/IrisTracker';

const GazeCalibration = ({ onComplete, onCancel }) => {
    // Phase: 'intro' -> 'camera_init' -> 'capture_template' -> 'verifying' -> 'complete'
    const [phase, setPhase] = useState('intro');
    const [cameraError, setCameraError] = useState(null);
    const [debugMsg, setDebugMsg] = useState('Align eyes in the box. Keep head still.');
    const [cvReady, setCvReady] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const trackerRef = useRef(new IrisTracker());
    const streamRef = useRef(null);

    // Initial Setup & OpenCV Check
    useEffect(() => {
        const checkCv = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                setCvReady(true);
                clearInterval(checkCv);
            }
        }, 500);

        return () => {
            clearInterval(checkCv);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        if (!cvReady) {
            setCameraError("AI Engine (OpenCV) is still loading. Please wait a moment.");
            setPhase('error');
            return;
        }

        setPhase('camera_init');

        // Safety timeout
        const timeoutId = setTimeout(() => {
            if (videoRef.current && !videoRef.current.srcObject) {
                setCameraError("Camera initialization timed out. Please refresh or check browser permissions.");
                setPhase('error');
            }
        }, 10000);

        try {
            // Simplified constraints for better compatibility on mobile/safari
            // We ask for HD, but allow fallback
            const constraints = {
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            clearTimeout(timeoutId);
            streamRef.current = stream;

            // Wait for video element
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play().catch(e => console.error("Play error:", e));
                        setPhase('capture_template');
                    };
                }
            }, 500);

        } catch (err) {
            clearTimeout(timeoutId);
            console.error("Camera Error:", err);
            setCameraError("Could not access camera. Please allow permissions and ensure no other app is using it.");
            setPhase('error');
        }
    };

    const captureTemplate = () => {
        if (!videoRef.current || !window.cv) {
            setDebugMsg("OpenCV not ready or Camera not active.");
            return;
        }

        setDebugMsg("Scanning... Open eyes wide!");

        // Slight delay to ensure UI updates
        setTimeout(() => {
            const success = trackerRef.current.initialize(videoRef.current);

            if (success) {
                setPhase('verifying');
                setDebugMsg("Iris Template Captured! Verifying tracking...");

                // Verify by tracking for a few frames
                verifyTracking();
            } else {
                setDebugMsg("Could not detect Iris. Please ensure good lighting and open eyes wider.");
            }
        }, 100);
    };

    const verifyTracking = () => {
        let goodFrames = 0;
        const maxFrames = 30; // 1 sec at 30fps
        let frameCount = 0;

        const interval = setInterval(() => {
            frameCount++;
            if (!videoRef.current) {
                clearInterval(interval);
                return;
            }
            const pos = trackerRef.current.track(videoRef.current);

            if (pos && pos.x > 0 && pos.y > 0) {
                goodFrames++;
            }

            if (frameCount >= maxFrames) {
                clearInterval(interval);
                if (goodFrames > 15) { // >50% confidence
                    setPhase('complete');
                    setDebugMsg("Tracking Verified. System Ready.");
                } else {
                    setDebugMsg("Tracking unstable. Retrying capture...");
                    setPhase('capture_template');
                }
            }
        }, 33);
    };

    // --- RENDERERS ---

    if (phase === 'intro') {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                <div className="max-w-md w-full glass-panel p-8 border border-white/10 rounded-2xl shadow-blue-500/20">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        👁
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Iris Tracker Setup</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed text-sm">
                        We use a clinical-grade "Hybrid CHT" algorithm to track eye movements.
                        <br /><br />
                        1. <strong>Hold phone steady</strong> at arm's length.
                        <br />
                        2. Ensure <strong>good lighting</strong> on your face.
                        <br />
                        3. When prompted, <strong>open eyes WIDE</strong>.
                    </p>

                    {!cvReady && (
                        <div className="mb-4 text-xs text-indigo-400 bg-indigo-500/10 p-2 rounded animate-pulse">
                            Loading AI Engine...
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={startCamera}
                            disabled={!cvReady}
                            className={`flex-1 btn-primary text-lg shadow-lg shadow-indigo-500/20 ${!cvReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Start Camera
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center animate-fadeIn text-center p-8">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h3 className="text-xl text-white font-bold mb-2">Camera Access Failed</h3>
                <p className="text-slate-400 mb-6">{cameraError}</p>
                <button
                    onClick={onCancel}
                    className="px-6 py-2 bg-slate-800 rounded-lg text-slate-300"
                >
                    Close
                </button>
            </div>
        );
    }

    if (phase === 'camera_init') {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center animate-fadeIn">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8"></div>
                <h3 className="text-xl text-white font-bold">Initializing High-Res Camera...</h3>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center">
            {/* Camera Feed */}
            <div className="relative w-full h-full md:w-auto md:h-auto md:max-w-4xl md:aspect-video bg-black md:rounded-2xl overflow-hidden shadow-2xl border-0 md:border border-slate-800 flex items-center justify-center opacity-100 visible">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform scale-x-[-1] opacity-60 md:opacity-100" // Dimmed slightly on mobile for UI legibility
                    playsInline
                    muted
                />

                {/* Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
                    {/* Face Box */}
                    <div className={`w-56 h-72 md:w-80 md:h-96 border-4 rounded-[4rem] transition-all duration-500 box-border ${phase === 'verifying'
                        ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-105'
                        : 'border-white/40 border-dashed animate-pulse'
                        }`}></div>

                    {/* Instructions Floating Near Face */}
                    <div className="absolute top-[20%] md:top-[25%] bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white font-bold text-xs md:text-sm shadow-xl z-20">
                        {phase === 'capture_template' ? 'Step 2: Align Face & Open Eyes' : 'Step 1: Initialization'}
                    </div>

                    {/* Eye Level Guide */}
                    <div className="absolute top-[35%] w-full h-px bg-blue-500/40"></div>
                </div>

                {/* Status Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-black via-black/90 to-transparent z-10 flex flex-col items-center pb-8 md:pb-10">
                    <div className="max-w-md w-full text-center">
                        <p className={`font-mono text-sm mb-6 font-bold tracking-wide uppercase ${phase === 'verifying' ? 'text-emerald-400' : 'text-blue-300'}`}>
                            {debugMsg}
                        </p>

                        {phase === 'capture_template' && (
                            <button
                                onClick={captureTemplate}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(99,102,241,0.4)] animate-pulse transition-all active:scale-95 border border-indigo-400/50"
                            >
                                Tap to Capture Iris
                            </button>
                        )}

                        {phase === 'verifying' && (
                            <div className="flex items-center justify-center gap-3 text-emerald-400 font-bold bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 w-full">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                Verifying Stability...
                            </div>
                        )}

                        {phase === 'complete' && (
                            <button
                                onClick={() => {
                                    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                                    if (onComplete) onComplete(trackerRef.current);
                                }}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span>Proceed to Tests</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Close Button */}
            <button
                onClick={() => {
                    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                    onCancel();
                }}
                className="absolute top-6 right-6 text-white/50 hover:text-white z-[201] bg-black/40 p-3 rounded-full backdrop-blur-md active:bg-white/10"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

export default GazeCalibration;

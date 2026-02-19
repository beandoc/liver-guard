
import React, { useState, useEffect, useRef } from 'react';
import { TEST_CONFIG } from './constants';

const DEMO_TEXT = {
    en: {
        lookDot: 'Look at the dot.',
        lookRight: 'Look RIGHT ->',
        lookLeft: '<- Look LEFT',
        lookGreen: 'Look at Green Dot',
        followCenter: 'Follow to Center',
        lookBack: 'Look back where it started!',
        track: 'Track smoothly.',
        stare: 'Stare only at the center dot.',
        invalidMap: 'Map Invalid: Move Closer',
        headStill: 'Keep Head Still',
        tooDark: 'Environment Too Dark',
        postError: 'Distance Changed: Re-align',
        driftError: 'Face Drifted: Center yourself'
    },
    hi: {
        lookDot: 'बिंदु को देखें।',
        lookRight: 'दाएं देखें ->',
        lookLeft: '<- बाएं देखें',
        lookGreen: 'हरे बिंदु को देखें',
        followCenter: 'केंद्र का अनुसरण करें',
        lookBack: 'वापस वहीं देखें जहां से शुरू हुआ था!',
        track: 'धीरे-धीरे ट्रैक करें।',
        stare: 'केवल केंद्र बिंदु को देखें।',
        invalidMap: 'मानचित्र अमान्य: करीब आएं',
        headStill: 'सिर स्थिर रखें',
        tooDark: 'वातावरण बहुत अंधेरा है',
        postError: 'दूरी बदल गई: फिर से align करें',
        driftError: 'चेहरा भटक गया: खुद को केंद्र में लाएं'
    },
    mr: {
        lookDot: 'बिंदूकडे पहा.',
        lookRight: 'उजवीकडे पहा ->',
        lookLeft: '<- डावीकडे पहा',
        lookGreen: 'हिरव्या बिंदूकडे पहा',
        followCenter: 'केंद्राकडे जा',
        lookBack: 'जिथे सुरू झाले तिथे परत पहा!',
        track: 'हळूवारपुरा मागोवा घ्या.',
        stare: 'केवळ केंद्र बिंदूकडे पहा.',
        invalidMap: 'नकाशा अवैध: जवळ या',
        headStill: 'डोके स्थिर ठेवा',
        tooDark: 'वातावरण खूप गडद आहे',
        postError: 'अंतर बदलले: पुन्हा संरेखित करा',
        driftError: 'चेहरा सरकला: स्वतःला मध्यभागी आणा'
    }
};

const OcularStimulus = ({ testId, isDemo = false, tracker, onComplete, onExit, videoElement, lang = 'en' }) => {
    const t = DEMO_TEXT[lang] || DEMO_TEXT.en;
    const requestRef = useRef();
    const startTimeRef = useRef(null);
    const gazeDataRef = useRef([]);
    const internalVideoRef = useRef(null);
    const streamRef = useRef(null);
    const isTrackingRef = useRef(false); // Prevention of concurrent AI calls

    // Ref to track current simulation state (synced with visual state for recording)
    const targetStateRef = useRef({ x: 50, y: 50, visible: true, ghost: false, color: null });

    const config = TEST_CONFIG[testId.toUpperCase()];

    // Visual State for React Render
    const [targetPos, setTargetPos] = useState({ x: 50, y: 50, visible: true });
    const [distanceWarning, setDistanceWarning] = useState(false);

    // Live Gaze State
    const [liveGaze, setLiveGaze] = useState(null);
    const [headWarning, setHeadWarning] = useState(false);
    const [isTooDark, setIsTooDark] = useState(false);
    const [postureWarning, setPostureWarning] = useState('');
    const startPostureRef = useRef(null);

    // Demo Text State
    const [demoInstruction, setDemoInstruction] = useState('');
    const [currentConfidence, setCurrentConfidence] = useState(0); // Signal Quality (0.0 - 1.0)
    const lastFaceZRef = useRef(null);

    useEffect(() => {
        // --- High Performance Camera Setup for Hybrid Tracker ---
        const setupCamera = async () => {
            // If demo, we don't need camera
            if (isDemo) return;

            // Ensure tracker is initialized (loads MediaPipe libraries)
            if (tracker && !tracker.isReady) {
                console.log('[OcularStimulus] Initializing tracker engine...');
                await tracker.initialize();
            }

            // Use Shared Video Stream if available (Preferred)
            if (videoElement && videoElement.srcObject) {
                if (internalVideoRef.current) {
                    internalVideoRef.current.srcObject = videoElement.srcObject;
                    await internalVideoRef.current.play();
                }
                console.log('[OcularStimulus] Camera ready via shared stream');
                return;
            }

            // Retry: wait for shared video to become available (parent may still be initializing)
            for (let attempt = 0; attempt < 10; attempt++) {
                await new Promise(r => setTimeout(r, 300));
                if (videoElement && videoElement.srcObject) {
                    if (internalVideoRef.current) {
                        internalVideoRef.current.srcObject = videoElement.srcObject;
                        await internalVideoRef.current.play();
                    }
                    console.log(`[OcularStimulus] Camera ready via shared stream (attempt ${attempt + 1})`);
                    return;
                }
            }

            // Fallback: Request camera locally
            console.warn('[OcularStimulus] Shared stream unavailable, requesting own camera');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: 640, height: 480 }
                });
                streamRef.current = stream;
                if (internalVideoRef.current) {
                    internalVideoRef.current.srcObject = stream;
                    await internalVideoRef.current.play();
                }
                console.log('[OcularStimulus] Camera ready via fallback stream');
            } catch (e) {
                console.error("Test Camera Error:", e);
            }
        };

        setupCamera();

        if (!config || !startTimeRef.current) {
            startTimeRef.current = Date.now();
        }

        const startTime = startTimeRef.current;
        let lastEventTime = startTime;

        // Memory Sequence Variables (Ref-like in closure)
        let memoryX = 50;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;

            if (!isDemo && elapsed > config.duration) {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                }
                if (onComplete) onComplete(gazeDataRef.current);
                return;
            }

            // --- 1. Simulation Logic (Update targetStateRef) ---
            let newState = { ...targetStateRef.current };
            let instruction = '';

            if (config.type === 'jump') {
                if (now - lastEventTime > config.jumpInterval) {
                    const newX = 10 + Math.random() * 80;
                    const newY = 40 + Math.random() * 20;
                    newState = { x: newX, y: newY, visible: true };
                    lastEventTime = now;
                    if (isDemo) instruction = t.lookDot;
                }
            }
            else if (config.type === 'antisaccade') {
                if (now - lastEventTime > config.jumpInterval) {
                    const side = Math.random() > 0.5 ? 20 : 80;
                    newState = { x: side, y: 50, visible: true, color: '#f87171' }; // Red Cue
                    lastEventTime = now;
                    if (isDemo) instruction = side < 50 ? t.lookRight : t.lookLeft;
                }
                else if (now - lastEventTime > 1000 && newState.visible) {
                    newState.visible = false;
                }
            }
            else if (config.type === 'memory_sequence') {
                const cycleTime = config.phases.peripheral + config.phases.center + config.phases.response;
                const cycleOffset = elapsed % cycleTime;
                const cycleIndex = Math.floor(elapsed / cycleTime);

                const isLeft = (cycleIndex % 2 === 0);
                memoryX = isLeft ? 20 : 80;

                if (cycleOffset < config.phases.peripheral) {
                    newState = { x: memoryX, y: 50, visible: true, color: '#10b981' };
                    if (isDemo) instruction = t.lookGreen;
                } else if (cycleOffset < (config.phases.peripheral + config.phases.center)) {
                    newState = { x: 50, y: 50, visible: true, color: '#10b981' };
                    if (isDemo) instruction = t.followCenter;
                } else {
                    if (isDemo) {
                        newState = { x: memoryX, y: 50, visible: true, ghost: true, color: 'white' };
                        instruction = t.lookBack;
                    } else {
                        newState = { ...newState, visible: false };
                    }
                }
            }
            else if (config.type === 'smooth_linear') {
                const frac = (elapsed % config.lapTime) / config.lapTime;
                let x = frac < 0.5 ? 10 + (frac * 2) * 80 : 90 - ((frac - 0.5) * 2) * 80;
                newState = { x, y: 50, visible: true, color: '#6366f1' };
                if (isDemo) instruction = t.track;
            }
            else if (config.type === 'fixation') {
                newState = { x: 50, y: 50, visible: true, color: '#fcd34d' };
                if (isDemo) instruction = t.stare;
            }

            // --- 2. Update Visuals ---
            if (newState.x !== targetStateRef.current.x || newState.y !== targetStateRef.current.y || newState.visible !== targetStateRef.current.visible) {
                setTargetPos(newState);
                if (instruction) setDemoInstruction(instruction);
                targetStateRef.current = newState;
            }

            // --- 3. Clinical Tracking (MediaPipe) ---
            const activeVideo = videoElement || internalVideoRef.current;
            if (!isDemo && tracker && activeVideo && activeVideo.readyState >= 2 && !isTrackingRef.current) {
                isTrackingRef.current = true; // Lock

                // Brightness Check (P3)
                if (Math.random() > 0.98) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 40; canvas.height = 40;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(activeVideo, 0, 0, 40, 40);
                    const data = ctx.getImageData(0, 0, 40, 40).data;
                    let lum = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        lum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                    }
                    setIsTooDark((lum / 400) < 40);
                }

                tracker.track(activeVideo).then(pos => {
                    isTrackingRef.current = false; // Release
                    if (pos) {
                        // Distance Guard Rail (P2)
                        if (pos.faceZ < 0.22) {
                            if (!distanceWarning) setDistanceWarning(true);
                        } else {
                            if (distanceWarning) setDistanceWarning(false);
                        }


                        // 1. Snapshot / Compare Posture (P1/P2)
                        if (!startPostureRef.current) {
                            startPostureRef.current = { z: pos.faceZ, center: pos.faceCenter };
                        } else {
                            const zDiff = Math.abs(pos.faceZ - startPostureRef.current.z);
                            const xDiff = Math.abs(pos.faceCenter.x - startPostureRef.current.center.x);
                            const yDiff = Math.abs(pos.faceCenter.y - startPostureRef.current.center.y);

                            if (zDiff > 0.06) setPostureWarning(t.postError);
                            else if (xDiff > 0.1 || yDiff > 0.1) setPostureWarning(t.driftError);
                            else setPostureWarning('');
                        }

                        // Live Feedback - Now works even without calibration (Fallback mode)
                        const gaze = tracker.getGaze(pos.avg);
                        setLiveGaze(gaze);
                        setCurrentConfidence(pos.confidence);

                        // Head Stability Warning
                        if (lastFaceZRef.current) {
                            const zDiff = Math.abs(pos.faceZ - lastFaceZRef.current);
                            setHeadWarning(zDiff > 0.05); // Warn if moving too much toward/away
                        }
                        lastFaceZRef.current = pos.faceZ;

                        gazeDataRef.current.push({
                            time: Date.now(),
                            eyeX: pos.avg.x,
                            eyeY: pos.avg.y,
                            leftEye: pos.left,
                            rightEye: pos.right,
                            isBlinking: pos.isBlinking,
                            confidence: pos.confidence,
                            targetX: targetStateRef.current.x,
                            targetY: targetStateRef.current.y,
                            targetVisible: targetStateRef.current.visible
                        });
                    } else {
                        // We reset live gaze on failure so user knows it's not locked
                        setLiveGaze(null);
                        setCurrentConfidence(0);
                    }
                }).catch(err => {
                    isTrackingRef.current = false;
                    console.error("[OcularStimulus] Tracking loop error:", err);
                });
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(requestRef.current);
            // DON'T stop shared stream tracks here
        };
    }, [config, isDemo, onComplete, testId, tracker, videoElement, lang]);

    // Render logic
    return (
        <div className="fixed inset-0 bg-black cursor-none touch-none overflow-hidden z-[100] select-none" style={{ touchAction: 'none' }}>
            {/* Target */}
            {targetPos.visible && (
                <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                        left: `${targetPos.x}%`,
                        top: `${targetPos.y}%`,
                        width: config.targetSize + 'px',
                        height: config.targetSize + 'px',
                        backgroundColor: targetPos.ghost ? 'transparent' : (targetPos.color || '#f87171'),
                        border: targetPos.ghost ? '2px dashed #fff' : 'none',
                        boxShadow: targetPos.ghost ? 'none' : `0 0 15px ${targetPos.color || '#f87171'}`,
                        opacity: targetPos.ghost ? 0.5 : 1,
                        // CSS Transition for smooth pursuit only? 
                        // Actually, if we update state every frame for SPT, turn OFF transition to avoid lag.
                        // For Saccades, we want instant jump.
                        transition: config.type === 'smooth_linear' ? 'none' : 'none'
                        // 'none' is best for JS-driven animation to prevent fighting.
                    }}
                >
                    {/* Crosshair for fixation if needed */}
                    <div className="absolute inset-0 flex items-center justify-center text-white/50 text-[10px] opacity-0">+</div>
                </div>
            )}

            {/* Demo Overlay */}
            {isDemo && (
                <div className="absolute bottom-20 left-0 w-full text-center pointer-events-none">
                    <span className="text-white/80 text-xl font-mono bg-black/50 px-4 py-2 rounded-lg border border-white/20">
                        {demoInstruction}
                    </span>
                </div>
            )}

            {/* Live Gaze Cursor (Clinician Feedback) */}
            {!isDemo && liveGaze && (
                <div
                    className="absolute w-6 h-6 border-2 border-white/30 rounded-full flex items-center justify-center pointer-events-none transition-all duration-75"
                    style={{
                        left: `${liveGaze.x}%`,
                        top: `${liveGaze.y}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <div className="w-1 h-1 bg-white rounded-full opacity-50" />
                </div>
            )}

            {/* Diagnostics & Initialization Overlay */}
            {!isDemo && (!liveGaze || (tracker && !tracker.isReady)) && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-[200] pointer-events-none px-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-white/5 flex items-center justify-center">
                                    <div className={`w-10 h-10 rounded-full border-4 border-t-blue-500 border-l-transparent border-r-transparent border-b-transparent animate-spin`}></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={`w-3 h-3 rounded-full ${currentConfidence > 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-white font-bold text-xl mb-2">
                            {currentConfidence > 0 ? "Tracking Face..." : "Finding Face..."}
                        </h3>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold">
                                <span className="text-slate-500">Camera</span>
                                <span className={(videoElement || internalVideoRef.current) ? "text-green-500" : "text-yellow-500 animate-pulse"}>
                                    {(videoElement || internalVideoRef.current) ? "READY" : "WAITING"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold">
                                <span className="text-slate-500">AI Engine</span>
                                <span className={(tracker && tracker.isReady) ? "text-green-500" : "text-yellow-500 animate-pulse"}>
                                    {(tracker && tracker.isReady) ? "READY" : "LOADING..."}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold">
                                <span className="text-slate-500">Distance</span>
                                <span className={currentConfidence > 0 ? (distanceWarning ? "text-red-500 animate-bounce" : "text-green-500") : "text-slate-600"}>
                                    {currentConfidence > 0 ? (distanceWarning ? "TOO FAR" : "OK") : "---"}
                                </span>
                            </div>
                        </div>

                        <p className="text-slate-400 text-sm leading-relaxed">
                            {distanceWarning ? "Please move closer to the camera." : "Please center your face and wait for the lock."}
                        </p>
                    </div>
                </div>
            )}

            {/* Warnings Container */}
            <div className="absolute top-20 left-0 w-full flex flex-col items-center gap-2 pointer-events-none">
                {headWarning && (
                    <div className="bg-red-600/90 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-tighter animate-bounce">
                        {t.headStill}
                    </div>
                )}
                {postureWarning && (
                    <div className="bg-orange-600/90 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-tighter animate-pulse border border-orange-400">
                        {postureWarning}
                    </div>
                )}
                {isTooDark && (
                    <div className="bg-amber-600/90 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-tighter animate-pulse border border-amber-400/50">
                        {t.tooDark}
                    </div>
                )}
            </div>

            {/* Distance Warning Overlay */}
            {distanceWarning && (
                <div className="absolute top-40 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-full font-bold uppercase tracking-widest shadow-xl animate-pulse z-50 border border-red-400">
                    {t.invalidMap}
                </div>
            )}

            {/* Signal Quality (P2) */}
            {!isDemo && (
                <div className="absolute top-4 right-20 flex gap-[2px] items-end h-[14px] mr-2" title={`Quality: ${Math.round(currentConfidence * 100)}%`}>
                    <div className={`w-[3px] rounded-sm ${currentConfidence > 0.2 ? (currentConfidence > 0.4 ? 'bg-green-500' : 'bg-yellow-500') : 'bg-red-500/50'} h-[40%] transition-colors duration-300`}></div>
                    <div className={`w-[3px] rounded-sm ${currentConfidence > 0.5 ? 'bg-green-500' : 'bg-white/10'} h-[70%] transition-colors duration-300`}></div>
                    <div className={`w-[3px] rounded-sm ${currentConfidence > 0.8 ? 'bg-green-500' : 'bg-white/10'} h-[100%] transition-colors duration-300`}></div>
                </div>
            )}

            {/* Indication of Active Recording */}
            {!isDemo && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-500 text-xs font-mono">{t.recording}</span>
                </div>
            )}

            {/* Exit Button (D6) */}
            {!isDemo && onExit && (
                <button
                    onClick={onExit}
                    className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors backdrop-blur-md active:scale-95 hover:bg-red-500/20 hover:border-red-500/30 group"
                >
                    <svg className="w-5 h-5 group-hover:stroke-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Hidden Video for Tracking */}
            <video
                ref={internalVideoRef}
                className="hidden"
                playsInline
                muted
            />
        </div>
    );
};

export default OcularStimulus;

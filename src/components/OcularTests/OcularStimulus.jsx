
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
        driftError: 'Face Drifted: Center yourself',
        aligningFace: 'Aligning Face...',
        signalLock: 'Signal Locked: Starting Test',
        recording: 'REC'
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
        driftError: 'चेहरा भटक गया: खुद को केंद्र में लाएं',
        aligningFace: 'चेहरा संरेखित हो रहा है...',
        signalLock: 'सिग्नल लॉक: परीक्षण शुरू हो रहा है',
        recording: 'रिकॉर्डिंग'
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
        driftError: 'चेहरा सरकला: स्वतःला मध्यभागी आणा',
        aligningFace: 'चेहरा संरेखित होत आहे...',
        signalLock: 'सिग्नल लॉक: चाचणी सुरू होत आहे',
        recording: 'रेकॉर्डिंग'
    }
};

const MemoizedVideo = React.memo(React.forwardRef(({ className }, ref) => (
    <video
        ref={ref}
        className={className}
        playsInline
        muted
        crossOrigin="anonymous"
    />
)));

const OcularStimulus = ({ testId, isDemo = false, tracker, onComplete, onExit, videoElement, lang = 'en' }) => {
    const t = DEMO_TEXT[lang] || DEMO_TEXT.en;
    const requestRef = useRef();
    const startTimeRef = useRef(null);
    const gazeDataRef = useRef([]);
    const internalVideoRef = useRef(null);
    const streamRef = useRef(null);
    const isTrackingRef = useRef(false);

    const targetStateRef = useRef({ x: 50, y: 50, visible: true, ghost: false, color: null });
    const stimulusOnsetRef = useRef(null); // Tier 1 Fix #3: precise stimulus event marker
    const trackingIntervalRef = useRef(null); // Tier 1 Fix #1: decoupled tracking loop

    const config = TEST_CONFIG[testId.toUpperCase()];

    // Visual State
    const [targetPos, setTargetPos] = useState({ x: 50, y: 50, visible: true });
    const [distanceWarning, setDistanceWarning] = useState(false);
    const [liveGaze, setLiveGaze] = useState(null);
    const [exitConfirm, setExitConfirm] = useState(false);
    const [headWarning, setHeadWarning] = useState(false);
    const [isTooDark, setIsTooDark] = useState(false);
    const [postureWarning, setPostureWarning] = useState('');
    const startPostureRef = useRef(null);
    const [demoInstruction, setDemoInstruction] = useState('');
    const [currentConfidence, setCurrentConfidence] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState("INITIALIZING...");
    const lastFaceZRef = useRef(null);

    // Poll for AI status updates during loading
    useEffect(() => {
        if (!tracker || tracker.isReady) return;
        const interval = setInterval(() => {
            if (window._irisTrackerStatus && window._irisTrackerStatus !== loadingStatus) {
                setLoadingStatus(window._irisTrackerStatus);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [tracker, loadingStatus]);

    useEffect(() => {
        const setupCamera = async () => {
            if (isDemo) return;

            // Initialize tracker FIRST (before checking video)
            if (tracker && !tracker.isReady) {
                console.log('[OcularStimulus] Initializing tracker...');
                await tracker.initialize();
            }

            // Guard: already streaming
            if (internalVideoRef.current && internalVideoRef.current.srcObject) {
                if (internalVideoRef.current.paused) {
                    internalVideoRef.current.play().catch(() => { });
                }
                return;
            }

            // Try shared video stream
            if (videoElement && videoElement.srcObject) {
                if (internalVideoRef.current) {
                    internalVideoRef.current.srcObject = videoElement.srcObject;
                    await internalVideoRef.current.play();
                }
                console.log('[OcularStimulus] Camera ready via shared stream');
                return;
            }

            // Retry shared stream
            for (let attempt = 0; attempt < 10; attempt++) {
                await new Promise(r => setTimeout(r, 300));
                if (videoElement && videoElement.srcObject) {
                    if (internalVideoRef.current) {
                        internalVideoRef.current.srcObject = videoElement.srcObject;
                        await internalVideoRef.current.play();
                    }
                    console.log(`[OcularStimulus] Camera ready (attempt ${attempt + 1})`);
                    return;
                }
            }

            // Fallback: own camera
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
            } catch (e) {
                console.error("Camera Error:", e);
            }
        };

        setupCamera();

        let lockCounter = 0;
        let lastEventTime = 0;
        let memoryX = 50;

        // ============================================================
        // TIER 1 FIX #1: DECOUPLED HIGH-FREQUENCY TRACKING LOOP
        // Runs at ~125Hz (8ms interval) independent of rendering frame rate.
        // This gives ≤8ms temporal precision for saccade latency measurement,
        // compared to ~16ms when coupled to requestAnimationFrame.
        // ============================================================
        const startTrackingLoop = () => {
            if (isDemo) return;

            trackingIntervalRef.current = setInterval(() => {
                const activeVideo = videoElement || internalVideoRef.current;

                // Auto-recover paused video
                if (activeVideo && activeVideo.paused && activeVideo.srcObject) {
                    activeVideo.play().catch(() => { });
                }

                if (!tracker || !activeVideo || activeVideo.readyState < 2 || isTrackingRef.current) return;
                isTrackingRef.current = true;

                // Occasional brightness check
                if (Math.random() > 0.99) {
                    try {
                        const c = document.createElement('canvas');
                        c.width = 40; c.height = 40;
                        const ctx = c.getContext('2d');
                        ctx.drawImage(activeVideo, 0, 0, 40, 40);
                        const px = ctx.getImageData(0, 0, 40, 40).data;
                        let lum = 0;
                        for (let i = 0; i < px.length; i += 4) lum += (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
                        setIsTooDark((lum / 400) < 40);
                    } catch (_e) { /* ignore */ }
                }

                tracker.track(activeVideo).then(pos => {
                    isTrackingRef.current = false;
                    if (!pos) {
                        setLiveGaze(null);
                        setCurrentConfidence(0);
                        return;
                    }

                    const isDistOk = pos.faceZ >= 0.1 && pos.faceZ <= 0.8;
                    const isPosOk = pos.faceCenter.x > 0.1 && pos.faceCenter.x < 0.9 && pos.faceCenter.y > 0.1 && pos.faceCenter.y < 0.9;
                    setDistanceWarning(!isDistOk);

                    // Pre-lock: accumulate stable frames
                    if (!startTimeRef.current) {
                        if (isDistOk && isPosOk && pos.confidence > 0.3) {
                            lockCounter++;
                            if (lockCounter >= 15) {
                                console.log('[OcularStimulus] Signal Locked. Starting test.');
                                startTimeRef.current = performance.now();
                                lastEventTime = startTimeRef.current;
                            }
                        } else {
                            lockCounter = 0;
                        }
                        setCurrentConfidence(pos.confidence);
                        setLiveGaze(tracker.getGaze(pos.avg));
                        return;
                    }

                    // Post-lock: posture monitoring
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

                    const gaze = tracker.getGaze(pos.avg);
                    setLiveGaze(gaze);
                    setCurrentConfidence(pos.confidence);

                    if (lastFaceZRef.current) {
                        setHeadWarning(Math.abs(pos.faceZ - lastFaceZRef.current) > 0.05);
                    }
                    lastFaceZRef.current = pos.faceZ;

                    // TIER 1 FIX #3: Record data with precise stimulus onset timestamp
                    gazeDataRef.current.push({
                        time: performance.now(),
                        eyeX: pos.avg.x,
                        eyeY: pos.avg.y,
                        leftEye: pos.left,
                        rightEye: pos.right,
                        vergenceX: pos.vergenceX,
                        vergenceY: pos.vergenceY,
                        isBlinking: pos.isBlinking,
                        confidence: pos.confidence,
                        targetX: targetStateRef.current.x,
                        targetY: targetStateRef.current.y,
                        targetVisible: targetStateRef.current.visible,
                        stimulusOnsetTime: stimulusOnsetRef.current, // Precise event marker
                        headX: pos.faceCenter.x,
                        headY: pos.faceCenter.y
                    });
                }).catch(() => {
                    isTrackingRef.current = false;
                });
            }, 8); // 8ms = ~125Hz sampling
        };

        startTrackingLoop();

        // ============================================================
        // VISUAL SIMULATION LOOP (60fps via requestAnimationFrame)
        // Handles target dot movement and stimulus timing.
        // Decoupled from tracking — visuals don't affect data collection.
        // ============================================================
        const animate = () => {
            const now = performance.now();

            // Wait for lock before running test simulation
            if (!startTimeRef.current) {
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const startTime = startTimeRef.current;
            const elapsed = now - startTime;

            // Test duration check
            if (!isDemo && elapsed > config.duration) {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                }
                if (onComplete) onComplete(gazeDataRef.current);
                return;
            }

            // --- Simulation Logic ---
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
            else if (config.type === 'antisaccade_gap') {
                const cycleTime = config.gapDuration + config.cueDuration + config.itiDuration;
                const trialOffset = elapsed % cycleTime;

                if (trialOffset < config.itiDuration) {
                    newState = { x: 50, y: 50, visible: false };
                } else if (trialOffset < config.itiDuration + config.gapDuration) {
                    newState = { x: 50, y: 50, visible: true, color: '#ffffff', isFixation: true };
                } else {
                    const trialNumber = Math.floor(elapsed / cycleTime);
                    const side = (trialNumber % 4 < 2) ? config.targetEccentricity : (100 - config.targetEccentricity);
                    newState = { x: side, y: 50, visible: true, color: '#f87171', isFixation: false, correctX: 100 - side };
                    if (isDemo) instruction = side < 50 ? t.lookRight : t.lookLeft;
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
                        // TIER 2 FIX: Move target to memory location so data stream records a "jump" event
                        // even though it's invisible. This acts as the "Go" signal for the analyzer.
                        newState = { x: memoryX, y: 50, visible: false };
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

            // Update visual state if changed — with precise stimulus onset timestamp
            const isChanged =
                newState.x !== targetStateRef.current.x ||
                newState.y !== targetStateRef.current.y ||
                newState.visible !== targetStateRef.current.visible ||
                newState.color !== targetStateRef.current.color ||
                newState.ghost !== targetStateRef.current.ghost ||
                newState.isFixation !== targetStateRef.current.isFixation;

            if (isChanged) {
                const onsetTime = performance.now();
                newState.timestamp = onsetTime;
                // TIER 1 FIX #3: Record precise stimulus onset for latency measurement
                stimulusOnsetRef.current = onsetTime;
                setTargetPos(newState);
                if (instruction) setDemoInstruction(instruction);
                targetStateRef.current = newState;
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(requestRef.current);
            if (trackingIntervalRef.current) {
                clearInterval(trackingIntervalRef.current);
                trackingIntervalRef.current = null;
            }
        };
    }, [config, isDemo, onComplete, testId, tracker, videoElement, lang]);

    // --- RENDER ---
    return (
        <div className="fixed inset-0 bg-black cursor-none touch-none overflow-hidden z-[100] select-none" style={{ touchAction: 'none' }}>

            {/* ========== TARGET DOT (FIX BUG #5: was completely missing!) ========== */}
            {targetPos.visible && (
                <div
                    className="absolute pointer-events-none z-[120] transition-all duration-150 ease-out"
                    style={{
                        left: `${targetPos.x}%`,
                        top: `${targetPos.y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {/* Outer glow */}
                    <div
                        className="absolute rounded-full animate-ping opacity-30"
                        style={{
                            width: (config.targetSize || 20) * 2,
                            height: (config.targetSize || 20) * 2,
                            left: -(config.targetSize || 20) / 2,
                            top: -(config.targetSize || 20) / 2,
                            backgroundColor: targetPos.color || '#fbbf24',
                        }}
                    />
                    {/* Core dot */}
                    <div
                        className="rounded-full shadow-lg"
                        style={{
                            width: config.targetSize || 20,
                            height: config.targetSize || 20,
                            backgroundColor: targetPos.color || '#fbbf24',
                            boxShadow: `0 0 20px ${targetPos.color || '#fbbf24'}80, 0 0 60px ${targetPos.color || '#fbbf24'}40`,
                            opacity: targetPos.ghost ? 0.3 : 1,
                        }}
                    />
                </div>
            )}

            {/* ========== INSTRUCTION TEXT ========== */}
            {demoInstruction && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[125] pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md text-white text-sm font-bold px-6 py-3 rounded-full border border-white/10 shadow-xl uppercase tracking-widest">
                        {demoInstruction}
                    </div>
                </div>
            )}

            {/* ========== CAMERA LAYER ========== */}
            {!isDemo && (
                <div
                    className={`fixed transition-all duration-700 ease-in-out overflow-hidden bg-black z-[130]
                    ${(currentConfidence > 0.4 && tracker && tracker.isReady)
                            ? `top-4 left-4 w-28 h-28 rounded-2xl border-2 ${distanceWarning ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'}`
                            : 'inset-0 z-[130] rounded-none border-0'
                        }`}
                >
                    <MemoizedVideo
                        ref={internalVideoRef}
                        className="w-full h-full object-cover scale-x-[-1]"
                    />

                    {/* PiP Overlay */}
                    {(currentConfidence > 0.4 && tracker && tracker.isReady) && (
                        <>
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 pointer-events-none">
                                <div className="relative">
                                    <div className={`absolute -inset-4 border-t-2 border-l-2 w-4 h-4 ${distanceWarning ? 'border-red-500' : 'border-green-500'} transition-colors`}></div>
                                    <div className={`absolute -inset-4 bottom-auto left-auto border-t-2 border-r-2 w-4 h-4 ${distanceWarning ? 'border-red-500' : 'border-green-500'} transition-colors`}></div>
                                    <div className={`absolute -inset-4 top-auto right-auto border-b-2 border-l-2 w-4 h-4 ${distanceWarning ? 'border-red-500' : 'border-green-500'} transition-colors`}></div>
                                    <div className={`absolute -inset-4 top-auto left-auto border-b-2 border-r-2 w-4 h-4 ${distanceWarning ? 'border-red-500' : 'border-green-500'} transition-colors`}></div>
                                    <div className={`text-[8px] font-bold uppercase tracking-widest ${distanceWarning ? 'text-red-500' : 'text-green-500'}`}>
                                        {distanceWarning ? 'Too Far' : 'Locked'}
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
                                <div className={`h-full transition-all duration-300 ${currentConfidence > 0.6 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${currentConfidence * 100}%` }}></div>
                            </div>
                        </>
                    )}

                    {/* Full Screen Dimmer */}
                    {!(currentConfidence > 0.4 && tracker && tracker.isReady) && (
                        <div className="absolute inset-0 bg-black/40" />
                    )}
                </div>
            )}

            {/* ========== SEARCHING STATUS PANEL ========== */}
            {!isDemo && (!liveGaze || (tracker && !tracker.isReady)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-[140] pointer-events-none px-6">
                    <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
                        <div className="flex justify-center mb-8">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-l-transparent border-r-transparent border-b-transparent animate-spin"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={`w-4 h-4 rounded-full ${currentConfidence > 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]`}></div>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-white font-black text-2xl mb-2 tracking-tight">
                            {currentConfidence > 0 ? "FACE DETECTED" : "SEARCHING..."}
                        </h3>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-black">
                                <span className="text-slate-500">Sensor Status</span>
                                <span className={(videoElement || internalVideoRef.current) ? "text-green-500" : "text-yellow-500 animate-pulse"}>
                                    {(videoElement || internalVideoRef.current) ? "ONLINE" : "OFFLINE"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-black">
                                <span className="text-slate-500">AI Compute</span>
                                <span className={(tracker && tracker.isReady) ? "text-green-500" : "text-yellow-500 animate-pulse text-[8px]"}>
                                    {(tracker && tracker.isReady) ? "READY" : loadingStatus}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-black">
                                <span className="text-slate-500">Position Lock</span>
                                <span className={currentConfidence > 0 ? (distanceWarning ? "text-red-500 animate-bounce" : "text-green-500") : "text-slate-700"}>
                                    {currentConfidence > 0 ? (distanceWarning ? "DISTANCE ERROR" : "SECURED") : "WAITING"}
                                </span>
                            </div>
                        </div>

                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            {!(tracker && tracker.isReady)
                                ? "AI model loading... Please wait (first launch takes ~10s)."
                                : distanceWarning
                                    ? "Please move closer to the camera."
                                    : "Look directly into the camera and remain still."}
                        </p>
                    </div>
                </div>
            )}

            {/* ========== WARNINGS ========== */}
            <div className="absolute top-20 left-0 w-full flex flex-col items-center gap-2 pointer-events-none z-[135]">
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

            {/* Distance Warning */}
            {distanceWarning && (
                <div className="absolute top-40 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-full font-bold uppercase tracking-widest shadow-xl animate-pulse z-50 border border-red-400">
                    {t.invalidMap}
                </div>
            )}

            {/* Signal Quality Bars */}
            {!isDemo && (
                <div className="absolute top-4 right-20 flex gap-[2px] items-end h-[14px] mr-2 z-[135]" title={`Quality: ${Math.round(currentConfidence * 100)}%`}>
                    <div className={`w-[3px] rounded-sm ${currentConfidence > 0.2 ? (currentConfidence > 0.4 ? 'bg-green-500' : 'bg-yellow-500') : 'bg-red-500/50'} h-[40%] transition-colors duration-300`}></div>
                    <div className={`w-[3px] rounded-sm ${currentConfidence > 0.5 ? 'bg-green-500' : 'bg-white/10'} h-[70%] transition-colors duration-300`}></div>
                    <div className={`w-[3px] rounded-sm ${currentConfidence > 0.8 ? 'bg-green-500' : 'bg-white/10'} h-[100%] transition-colors duration-300`}></div>
                </div>
            )}

            {/* Recording Indicator */}
            {!isDemo && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 z-[135]">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-500 text-xs font-mono">{t.recording}</span>
                </div>
            )}

            {/* Abort Button */}
            {!isDemo && onExit && (
                <button
                    onClick={() => setExitConfirm(true)}
                    className="absolute top-6 left-6 z-[150] w-10 h-10 rounded-full bg-black/20 hover:bg-red-500/20 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 transition-all backdrop-blur-sm active:scale-90"
                    aria-label="Abort Test"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Abort Confirmation */}
            {exitConfirm && (
                <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn" style={{ cursor: 'default' }}>
                    <div className="max-w-sm w-full bg-slate-900 border border-white/10 p-8 rounded-[2rem] text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Abort Ocular Protocol?</h2>
                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            Are you sure you want to end this session? All ocular-motor tracking data for this specific test will be lost.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={onExit} className="w-full py-4 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer">
                                Yes, End Test
                            </button>
                            <button onClick={() => setExitConfirm(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all active:scale-95 cursor-pointer">
                                No, Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OcularStimulus;

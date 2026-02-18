
import React, { useState, useEffect, useRef } from 'react';
import { TEST_CONFIG } from './constants';

const OcularStimulus = ({ testId, isDemo = false, onComplete }) => {
    const requestRef = useRef();
    const startTimeRef = useRef(null);
    const gazeDataRef = useRef([]);

    // Ref to track current simulation state (synced with visual state for recording)
    const targetStateRef = useRef({ x: 50, y: 50, visible: true, ghost: false, color: null });

    const config = TEST_CONFIG[testId.toUpperCase()];

    // Visual State for React Render
    const [targetPos, setTargetPos] = useState({ x: 50, y: 50, visible: true });

    // Demo Text State
    const [demoInstruction, setDemoInstruction] = useState('');

    useEffect(() => {
        // Toggle video preview
        if (window.webgazer) {
            const shouldShow = false; // Always hide during test
            window.webgazer.showVideoPreview(shouldShow).showPredictionPoints(shouldShow);
            if (!isDemo) window.webgazer.resume();
        }

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
                if (window.webgazer) {
                    window.webgazer.pause();
                    console.log(`Test ${testId} Data Points:`, gazeDataRef.current.length);
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
                    if (isDemo) instruction = 'Look at the dot.';
                }
            }
            else if (config.type === 'antisaccade') {
                // Cue appears
                if (now - lastEventTime > config.jumpInterval) {
                    const side = Math.random() > 0.5 ? 20 : 80;
                    newState = { x: side, y: 50, visible: true, color: '#f87171' }; // Red Cue
                    lastEventTime = now;
                    if (isDemo) instruction = side < 50 ? 'Look RIGHT ->' : '<- Look LEFT';
                }
                // Cue disappears after 1s
                else if (now - lastEventTime > 1000 && newState.visible) {
                    newState.visible = false;
                }
            }
            else if (config.type === 'memory_sequence') {
                const cycleTime = config.phases.peripheral + config.phases.center + config.phases.response;
                const cycleOffset = elapsed % cycleTime;
                const cycleIndex = Math.floor(elapsed / cycleTime);

                // Determine memory location for this cycle
                const isLeft = (cycleIndex % 2 === 0);
                memoryX = isLeft ? 20 : 80;

                if (cycleOffset < config.phases.peripheral) {
                    // Phase 1: Peripheral
                    newState = { x: memoryX, y: 50, visible: true, color: '#10b981' };
                    if (isDemo) instruction = 'Look at Green Dot';
                } else if (cycleOffset < (config.phases.peripheral + config.phases.center)) {
                    // Phase 2: Center
                    newState = { x: 50, y: 50, visible: true, color: '#10b981' };
                    if (isDemo) instruction = 'Follow to Center';
                } else {
                    // Phase 3: Response
                    if (isDemo) {
                        newState = { x: memoryX, y: 50, visible: true, ghost: true, color: 'white' };
                        instruction = 'Look back where it started!';
                    } else {
                        newState = { ...newState, visible: false };
                    }
                }
            }
            else if (config.type === 'smooth_linear') {
                const t = (elapsed % config.lapTime) / config.lapTime;
                let x = 0;
                if (t < 0.5) {
                    x = 10 + (t * 2) * 80;
                } else {
                    x = 90 - ((t - 0.5) * 2) * 80;
                }
                newState = { x, y: 50, visible: true, color: '#6366f1' }; // Accented smooth dot
                if (isDemo) instruction = 'Track smoothly.';
            }

            // --- 2. Update States ---
            // Only trigger React render if visual state changed meaningfully or for smooth pursuit (every frame)
            // For jump tests, optimization: check if x/y changed.
            if (newState.x !== targetStateRef.current.x || newState.y !== targetStateRef.current.y || newState.visible !== targetStateRef.current.visible) {
                setTargetPos(newState);
                if (instruction) setDemoInstruction(instruction);
                targetStateRef.current = newState;
            }

            // --- 3. Record Data ---
            if (!isDemo && window.webgazer) {
                const prediction = window.webgazer.getCurrentPrediction();
                if (prediction) {
                    gazeDataRef.current.push({
                        time: now,
                        gazeX: prediction.x,
                        gazeY: prediction.y,
                        targetX: targetStateRef.current.x, // still in % 
                        targetY: targetStateRef.current.y, // still in %
                        targetVisible: targetStateRef.current.visible
                    });
                }
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(requestRef.current);
            if (window.webgazer) {
                // Restore if needed, but usually we just leave it paused/hidden until next test
                // window.webgazer.pause(); 
            }
        };
    }, [config, isDemo, onComplete, testId]);

    // Render logic
    return (
        <div className="fixed inset-0 bg-black cursor-none touch-none overflow-hidden z-[100]">
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

            {/* Indication of Active Recording */}
            {!isDemo && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-500 text-xs font-mono">REC</span>
                </div>
            )}
        </div>
    );
};

export default OcularStimulus;

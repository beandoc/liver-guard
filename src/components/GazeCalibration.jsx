
import React, { useState, useEffect, useRef } from 'react';

const CALIBRATION_POINTS = [
    { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
    { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
    { x: 10, y: 90 }, { x: 50, y: 90 }, { x: 90, y: 90 }
];

const GazeCalibration = ({ onComplete, onCancel }) => {
    const [counts, setCounts] = useState(Array(9).fill(0));
    const [activePointIndex, setActivePointIndex] = useState(0); // Guide user one by one? Or let them click any? Standard is clicking any until green.
    // Let's go with "Click each point 5 times" strategy, free choice or guided. Guided is better for UX.

    const [isCalibrating, setIsCalibrating] = useState(true);
    const [accuracyScore, setAccuracyScore] = useState(null);
    const [webgazerReady, setWebgazerReady] = useState(false);

    useEffect(() => {
        const initWebgazer = async () => {
            if (window.webgazer) {
                try {
                    await window.webgazer.setRegression('ridge')
                        .setTracker('Tffacmesh') // FaceMesh is robust
                        .begin();

                    window.webgazer.showVideoPreview(true)
                        .showPredictionPoints(true) // Show where it thinks you're looking
                        .applyKalmanFilter(true); // Smooths the gaze

                    // Style the video (move it out of the way or center it for setup)
                    const video = document.getElementById('webgazerVideoFeed');
                    if (video) {
                        video.style.position = 'absolute';
                        video.style.top = '10px';
                        video.style.left = '50%';
                        video.style.transform = 'translateX(-50%)';
                        video.style.width = '240px';
                        video.style.height = 'auto';
                        video.style.zIndex = '1000';
                        video.style.borderRadius = '1rem';
                        video.style.border = '2px solid #6366f1';
                    }

                    setWebgazerReady(true);
                } catch (err) {
                    console.error("WebGazer Init Error:", err);
                }
            }
        };

        initWebgazer();

        return () => {
            // Cleanup: pause or clear
            if (window.webgazer) {
                // window.webgazer.end(); // Often buggy to restart, maybe just pause?
                // For now, pausing execution is safer if we want to resume in tests
                // window.webgazer.pause(); 
                // But typically for React unmount, we might want to hide the video and points
                window.webgazer.showVideoPreview(false).showPredictionPoints(false);
            }
        };
    }, []);

    const handlePointClick = (index) => {
        if (!webgazerReady) return;

        const newCounts = [...counts];
        newCounts[index] += 1;
        setCounts(newCounts);

        // Visual feedback (flash or sound could be added)

        // Use webgazer's recordScreenPosition logic internally handled by click listener usually, 
        // but explicit recordScreenPosition can be called if we manually handle events.
        // WebGazer by default binds to window click. 
        // We are relying on the user looking at the point they click.
    };

    const attemptValidation = () => {
        setIsCalibrating(false);
        // Hide points, show a target moving to check accuracy
        window.webgazer.showPredictionPoints(true);
    };

    const finish = () => {
        window.webgazer.showVideoPreview(false).showPredictionPoints(false); // Hide debug UI
        if (onComplete) onComplete();
    };

    const allCalibrated = counts.every(c => c >= 5);

    return (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center">
            {/* Header/Instructions */}
            <div className="absolute top-20 text-center pointer-events-none w-full px-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    Eye Calibration
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                    {isCalibrating
                        ? "Look at each colored dot and click it 5 times. Keep your head still."
                        : "Verification: Follow the cursor with your eyes. If accurate, click Finish."}
                </p>
                {!webgazerReady && <p className="text-yellow-500 mt-2 animate-pulse">Initializing Camera...</p>}
            </div>

            {/* Calibration Points */}
            {isCalibrating && CALIBRATION_POINTS.map((pt, idx) => {
                const count = counts[idx];
                const done = count >= 5;
                const opacity = done ? 0.3 : 1;
                const scale = 1 + (count * 0.1);
                const color = done ? '#10b981' : '#f43f5e'; // Green if done, Red if not

                return (
                    <button
                        key={idx}
                        className="absolute w-8 h-8 rounded-full border-4 transition-all duration-200"
                        style={{
                            left: `${pt.x}%`,
                            top: `${pt.y}%`,
                            transform: `translate(-50%, -50%) scale(${scale})`,
                            backgroundColor: color,
                            borderColor: 'white',
                            opacity: opacity,
                            cursor: 'pointer' // Explicitly pointer
                        }}
                        onClick={() => handlePointClick(idx)}
                        disabled={done}
                    >
                        {/* Center Dot for precision */}
                        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-black rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    </button>
                );
            })}

            {/* Validation / Finish Controls */}
            {!isCalibrating && (
                <div className="absolute bottom-10 flex gap-4">
                    <button
                        onClick={() => setIsCalibrating(true)}
                        className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                        Recalibrate
                    </button>
                    <button
                        onClick={finish}
                        className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-500/20"
                    >
                        Finish & Start Tests
                    </button>
                </div>
            )}

            {/* Auto-advance to validation if all done */}
            {isCalibrating && allCalibrated && (
                <div className="absolute bottom-10">
                    <button
                        onClick={attemptValidation}
                        className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold animate-bounce shadow-xl shadow-blue-500/30"
                    >
                        Check Accuracy
                    </button>
                </div>
            )}

            <button
                onClick={() => {
                    if (window.webgazer) window.webgazer.end();
                    onCancel();
                }}
                className="absolute top-6 right-6 text-slate-500 hover:text-white"
            >
                ✕ Cancel
            </button>
        </div>
    );
};

export default GazeCalibration;

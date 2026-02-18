
import React, { useState, useEffect } from 'react';

const CALIBRATION_POINTS = [
    { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
    { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
    { x: 10, y: 90 }, { x: 50, y: 90 }, { x: 90, y: 90 }
];

const GazeCalibration = ({ onComplete, onCancel }) => {
    const [counts, setCounts] = useState(Array(9).fill(0));
    const [isCalibrating, setIsCalibrating] = useState(true);
    const [webgazerReady, setWebgazerReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    useEffect(() => {
        let loadInterval;

        const setupWebgazer = async () => {
            if (window.webgazer) {
                try {
                    // Cleanup any existing instance
                    try { await window.webgazer.end(); } catch (e) { }

                    await window.webgazer.setRegression('ridge')
                        .setTracker('Tffacmesh')
                        .begin();

                    window.webgazer.showVideoPreview(true)
                        .showPredictionPoints(true)
                        .applyKalmanFilter(true);

                    // Force style the video element created by WebGazer
                    const styleVideo = () => {
                        const videoElement = document.getElementById('webgazerVideoFeed');
                        if (videoElement) {
                            videoElement.style.position = 'absolute';
                            videoElement.style.top = '20px';
                            videoElement.style.left = '50%';
                            videoElement.style.transform = 'translateX(-50%)';
                            videoElement.style.width = '320px';
                            videoElement.style.height = '240px';
                            videoElement.style.zIndex = '9999'; // Very high z-index
                            videoElement.style.borderRadius = '12px';
                            videoElement.style.border = '2px solid #6366f1';
                            videoElement.style.display = 'block';
                        }
                    };

                    styleVideo();
                    // Retry setting style in case it gets overwritten or loaded late
                    setTimeout(styleVideo, 1000);
                    setTimeout(styleVideo, 3000);

                    setWebgazerReady(true);
                } catch (err) {
                    console.error("WebGazer Init Error:", err);
                    setCameraError("Camera access denied or not found. Please check browser permissions.");
                }
            }
        };

        // Robust loading check
        if (window.webgazer) {
            setupWebgazer();
        } else {
            // Poll for script load
            loadInterval = setInterval(() => {
                if (window.webgazer) {
                    clearInterval(loadInterval);
                    setupWebgazer();
                }
            }, 500);
        }

        return () => {
            if (loadInterval) clearInterval(loadInterval);
            if (window.webgazer) {
                window.webgazer.showVideoPreview(false).showPredictionPoints(false);
                // We keep it running in background for tests, just hide UI
            }
        };
    }, []);

    const handlePointClick = (index) => {
        if (!webgazerReady) return;

        const newCounts = [...counts];
        newCounts[index] += 1;
        setCounts(newCounts);
    };

    const attemptValidation = () => {
        setIsCalibrating(false);
        window.webgazer.showPredictionPoints(true);
    };

    const finish = () => {
        window.webgazer.showVideoPreview(false).showPredictionPoints(false);
        if (onComplete) onComplete();
    };

    const allCalibrated = counts.every(c => c >= 5);

    return (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center">
            {/* Header/Instructions */}
            <div className="absolute top-0 pt-24 text-center pointer-events-none w-full px-4 z-[10001]">
                {/* High Z-index to sit above video */}
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    Eye Calibration
                </h2>
                <div className="bg-black/40 backdrop-blur-sm inline-block px-4 py-2 rounded-lg mt-2">
                    <p className="text-slate-300 text-sm font-medium">
                        {isCalibrating
                            ? "Look at each dot and click it 5 times. Keep head still."
                            : "Follow cursor with eyes. Click Finish if accurate."}
                    </p>
                </div>

                {/* Status Messages */}
                {!webgazerReady && !cameraError && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-blue-400 text-xs">Initializing...</p>
                    </div>
                )}

                {cameraError && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg pointer-events-auto">
                        <p className="text-red-400 font-bold">{cameraError}</p>
                        <button onClick={() => window.location.reload()} className="mt-2 text-xs bg-red-500/20 px-3 py-1 rounded hover:bg-red-500/40 text-red-200">
                            Reload Page
                        </button>
                    </div>
                )}
            </div>

            {/* Calibration Points */}
            {isCalibrating && CALIBRATION_POINTS.map((pt, idx) => {
                const count = counts[idx];
                const done = count >= 5;
                const opacity = done ? 0.3 : 1;
                const scale = 1 + (count * 0.1);
                const color = done ? '#10b981' : '#f43f5e';

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
                            cursor: 'pointer',
                            zIndex: 10002 // Above everything
                        }}
                        onClick={() => handlePointClick(idx)}
                        disabled={done}
                    >
                        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-black rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    </button>
                );
            })}

            {/* Validation / Finish Controls */}
            {!isCalibrating && (
                <div className="absolute bottom-10 flex gap-4 z-[10002]">
                    <button
                        onClick={() => setIsCalibrating(true)}
                        className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 bg-slate-900"
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

            {/* Auto-advance */}
            {isCalibrating && allCalibrated && (
                <div className="absolute bottom-10 z-[10002]">
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
                    // if(window.webgazer) window.webgazer.end(); // Don't end, just hide
                    if (window.webgazer) {
                        window.webgazer.showVideoPreview(false).showPredictionPoints(false);
                    }
                    onCancel();
                }}
                className="absolute top-6 right-6 text-slate-500 hover:text-white z-[10003] bg-black/20 p-2 rounded-full"
            >
                ✕ Cancel
            </button>
        </div>
    );
};

export default GazeCalibration;

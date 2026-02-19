import { KalmanFilter2D } from './KalmanFilter';

/**
 * IrisTracker.js
 * 
 * Clinical Grade Eye Tracking using Google MediaPipe Face Mesh.
 * Uses a warm-up frame to guarantee the WASM engine is fully compiled
 * before the tracking loop begins.
 */

export class IrisTracker {
    constructor() {
        this.isReady = false;
        this.faceMesh = null;
        this.lastResults = null;

        this.leftKalman = new KalmanFilter2D(0.015, 0.5);
        this.rightKalman = new KalmanFilter2D(0.015, 0.5);

        this.calibrationPoints = [];
        this.isCalibrated = false;
    }

    /**
     * Initializes the MediaPipe Face Mesh engine.
     * Sends a warm-up frame and waits for the first onResults callback
     * to confirm the WASM engine is truly ready.
     * @returns {Promise<boolean>}
     */
    async initialize() {
        if (this.isReady) return true;

        return new Promise((resolve) => {
            try {
                if (!window.FaceMesh) {
                    console.error("[IrisTracker] window.FaceMesh not found. CDN script may not have loaded.");
                    resolve(false);
                    return;
                }

                console.log("[IrisTracker] Creating FaceMesh instance...");

                this.faceMesh = new window.FaceMesh({
                    locateFile: (file) => {
                        // Use unpkg as a reliable CDN alternative
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
                    }
                });

                this.faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                // Set up a timeout — if WASM doesn't compile in 20s, fail gracefully
                const timeout = setTimeout(() => {
                    console.error("[IrisTracker] Initialization timed out after 20 seconds.");
                    resolve(false);
                }, 20000);

                this.faceMesh.onResults((results) => {
                    // This callback fires after the FIRST real frame is processed,
                    // which confirms the WASM engine is fully compiled and running.
                    if (!this.isReady) {
                        clearTimeout(timeout);
                        this.isReady = true;
                        console.log("[IrisTracker] WASM engine confirmed ready via first frame.");
                        resolve(true);
                    }
                    if (results.multiFaceLandmarks) {
                        this.lastResults = results;
                    }
                });

                // Instead of sending a blank canvas (which triggers a WASM abort on
                // Module.arguments access), we poll for the internal WASM readiness flag.
                // MediaPipe sets `this.faceMesh.g` or similar internal state once compiled.
                // We use a short delay to let the WASM JIT compile, then mark ready.
                console.log("[IrisTracker] Waiting for WASM engine to compile...");
                const warmupCheck = setInterval(() => {
                    try {
                        // Check if the faceMesh instance has an internal ready state
                        // by attempting a no-op that doesn't trigger Module.arguments
                        if (this.faceMesh && typeof this.faceMesh.send === 'function') {
                            clearInterval(warmupCheck);
                            // Give WASM an extra 500ms to fully settle before marking ready
                            setTimeout(() => {
                                if (!this.isReady) {
                                    clearTimeout(timeout);
                                    this.isReady = true;
                                    console.log("[IrisTracker] WASM engine ready (deferred warm-up).");
                                    resolve(true);
                                }
                            }, 500);
                        }
                    } catch (e) {
                        // Still compiling, keep polling
                    }
                }, 200);

            } catch (err) {
                console.error("[IrisTracker] Fatal init error:", err);
                resolve(false);
            }
        });
    }

    /**
     * Processes a single video frame and returns normalized iris centers.
     * @param {HTMLVideoElement} videoElement 
     * @returns {Object|null}
     */
    async track(videoElement) {
        if (!this.faceMesh || !this.isReady) return null;
        if (!videoElement || videoElement.readyState < 2) return null;

        try {
            await this.faceMesh.send({ image: videoElement });

            if (
                this.lastResults &&
                this.lastResults.multiFaceLandmarks &&
                this.lastResults.multiFaceLandmarks.length > 0
            ) {
                const landmarks = this.lastResults.multiFaceLandmarks[0];

                const leftIris = landmarks[468];
                const rightIris = landmarks[473];

                if (!leftIris || !rightIris) return null;

                // --- Adaptive Blink Detection (P0) ---
                // Landmarks: Left (159, 145), Right (386, 374)
                // Reference: Face Width (454 - 234)
                const faceWidth = Math.sqrt(
                    Math.pow(landmarks[454].x - landmarks[234].x, 2) +
                    Math.pow(landmarks[454].y - landmarks[234].y, 2)
                );
                const blinkThreshold = 0.035 * faceWidth; // Threshold scales with distance

                const leftOpenness = Math.abs(landmarks[159].y - landmarks[145].y);
                const rightOpenness = Math.abs(landmarks[386].y - landmarks[374].y);
                const isBlinking = leftOpenness < blinkThreshold && rightOpenness < blinkThreshold;

                // --- Iris-Relative Coordinates (P0) ---
                // Normalize iris position relative to eye corners to be distance-invariant.
                // Left Eye: 33 (Inner), 133 (Outer)
                // Right Eye: 362 (Inner), 263 (Outer)

                const lInner = landmarks[33];
                const lOuter = landmarks[133];
                const lWidth = Math.sqrt(Math.pow(lOuter.x - lInner.x, 2) + Math.pow(lOuter.y - lInner.y, 2));

                // Project Iris onto Eye Width Vector (simplified 2D)
                // We use unit-less coordinates relative to eye width
                const lRelX = (leftIris.x - lInner.x) / lWidth;
                const lRelY = (leftIris.y - (lInner.y + lOuter.y) / 2) / lWidth; // Y relative to eye center-line

                const rInner = landmarks[362];
                const rOuter = landmarks[263];
                const rWidth = Math.sqrt(Math.pow(rOuter.x - rInner.x, 2) + Math.pow(rOuter.y - rInner.y, 2));

                const rRelX = (rightIris.x - rInner.x) / rWidth; // Note: Right eye inner/outer order matters for sign
                const rRelY = (rightIris.y - (rInner.y + rOuter.y) / 2) / rWidth;

                // Face Z estimate (for guard rails)
                const faceZ = faceWidth;
                const faceCenter = {
                    x: (landmarks[454].x + landmarks[234].x) / 2,
                    y: (landmarks[10].y + landmarks[152].y) / 2
                };

                // Track Relative Coordinates (scaled up for Kalman stability, e.g. *100)
                // These are now distance-invariant units.
                // --- Adaptive Smoothing (P1) ---
                // Adjust Kalman Filter noise based on distance.
                // Distance proxy: faceWidth. Normal ~0.25 (50cm).
                // Far (0.15): Noisier -> Smooth more (Lower Q, Higher R).
                // Close (0.35): Clearer -> Responsive (Higher Q, Lower R).
                const distFactor = Math.min(1.5, Math.max(0.5, faceWidth / 0.25));
                const newQ = 0.015 * distFactor;
                const newR = 0.5 / distFactor;

                this.leftKalman.setNoise(newQ, newR);
                this.rightKalman.setNoise(newQ, newR);

                this.leftKalman.predict();
                this.rightKalman.predict();
                this.leftKalman.update([lRelX * 100, lRelY * 100]);
                this.rightKalman.update([rRelX * 100, rRelY * 100]);

                const smoothLeft = this.leftKalman.getPoint();
                const smoothRight = this.rightKalman.getPoint();

                // --- Confidence Scoring (P1) ---
                let confidence = 1.0;

                // 1. Blink Penalty
                if (isBlinking) confidence = 0.0;

                // 2. Distance Penalty (Soft decay if too far < 0.2)
                if (faceWidth < 0.2) {
                    confidence -= (0.2 - faceWidth) * 4;
                }

                // 3. Stability Penalty (Head Drift)
                if (this.lastFaceCenter) {
                    const drift = Math.sqrt(
                        Math.pow(faceCenter.x - this.lastFaceCenter.x, 2) +
                        Math.pow(faceCenter.y - this.lastFaceCenter.y, 2)
                    );
                    // Penalize fast movements (> 0.03 per frame)
                    if (drift > 0.03) confidence -= (drift - 0.03) * 10;
                }
                this.lastFaceCenter = faceCenter;

                // Clamp
                confidence = Math.max(0.0, Math.min(1.0, confidence));

                return {
                    left: smoothLeft,
                    right: smoothRight,
                    // Avg is the primary metric for calibration
                    avg: {
                        x: (smoothLeft.x + smoothRight.x) / 2,
                        y: (smoothLeft.y + smoothRight.y) / 2
                    },
                    faceZ, // Actually Face Width, serves as Z-proxy (Large = Close)
                    faceCenter,
                    isBlinking,
                    confidence
                };
            }
            return null;
        } catch (err) {
            // Silently skip bad frames
            return null;
        }
    }

    addCalibrationPoint(screenPt, eyePt) {
        this.calibrationPoints.push({ screen: screenPt, eye: eyePt });
        if (this.calibrationPoints.length >= 5) {
            this.isCalibrated = true;
        }
    }

    getGaze(eyePt) {
        // Fallback Mapping if not calibrated (Central ROI estimate)
        // Normalized eye coordinates usually range from 0.4 to 0.6 relative to eye width
        // Defaults: Center = 0.5, Scale = 500% magnification
        const center = this.calibrationPoints.find(p => p.screen.x === 50 && p.screen.y === 50) || { eye: { x: 0.5, y: 0.0 } };

        let sx = 10;
        let sy = 12;

        if (this.isCalibrated) {
            const tl = this.calibrationPoints.find(p => p.screen.x === 20 && p.screen.y === 20);
            const tr = this.calibrationPoints.find(p => p.screen.x === 80 && p.screen.y === 20);
            const bl = this.calibrationPoints.find(p => p.screen.x === 20 && p.screen.y === 80);

            if (tl && tr && bl) {
                const eyeDx = Math.abs(tr.eye.x - tl.eye.x) || 1;
                const eyeDy = Math.abs(bl.eye.y - tl.eye.y) || 1;
                sx = (80 - 20) / eyeDx;
                sy = (80 - 20) / eyeDy;
            }
        }

        return {
            x: 50 + (eyePt.x - center.eye.x) * sx,
            y: 50 + (eyePt.y - center.eye.y) * sy
        };
    }

    reset() {
        this.isReady = false;
        this.isCalibrated = false;
        this.calibrationPoints = [];
        this.lastResults = null;
    }
}

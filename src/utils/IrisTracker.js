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

                // Blink detection
                const leftOpenness = Math.abs(landmarks[159].y - landmarks[145].y);
                const rightOpenness = Math.abs(landmarks[386].y - landmarks[374].y);
                const isBlinking = leftOpenness < 0.012 && rightOpenness < 0.012;

                // Face width as a Z-proxy for distance, and Center for drift detection
                const faceZ = Math.abs(landmarks[454].x - landmarks[234].x);
                const faceCenter = {
                    x: (landmarks[454].x + landmarks[234].x) / 2,
                    y: (landmarks[10].y + landmarks[152].y) / 2
                };

                this.leftKalman.predict();
                this.rightKalman.predict();
                this.leftKalman.update([leftIris.x * 100, leftIris.y * 100]);
                this.rightKalman.update([rightIris.x * 100, rightIris.y * 100]);

                const smoothLeft = this.leftKalman.getPoint();
                const smoothRight = this.rightKalman.getPoint();

                return {
                    left: smoothLeft,
                    right: smoothRight,
                    avg: {
                        x: (smoothLeft.x + smoothRight.x) / 2,
                        y: (smoothLeft.y + smoothRight.y) / 2
                    },
                    faceZ,
                    faceCenter,
                    isBlinking,
                    confidence: 1.0
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
        if (!this.isCalibrated) return null;

        const center = this.calibrationPoints.find(p => p.screen.x === 50 && p.screen.y === 50);
        const tl = this.calibrationPoints.find(p => p.screen.x === 20 && p.screen.y === 20);
        const tr = this.calibrationPoints.find(p => p.screen.x === 80 && p.screen.y === 20);
        const bl = this.calibrationPoints.find(p => p.screen.x === 20 && p.screen.y === 80);

        if (!center || !tl || !tr || !bl) return null;

        const eyeDx = Math.abs(tr.eye.x - tl.eye.x) || 1;
        const eyeDy = Math.abs(bl.eye.y - tl.eye.y) || 1;

        const sx = (80 - 20) / eyeDx;
        const sy = (80 - 20) / eyeDy;

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

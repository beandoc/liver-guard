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

        // --- ARKit Native Bridge (P3 Phase 4) ---
        // When running inside a native iOS WKWebView, ARKit pushes
        // gaze data at 60fps via window.__arkitGaze().
        this._arkitLatestFrame = null;
        this._setupARKitBridge();
    }

    _setupARKitBridge() {
        if (typeof window !== 'undefined') {
            window.__arkitGaze = (data) => {
                this._arkitLatestFrame = data;
                this._arkitLatestFrame._receivedAt = performance.now();
            };
            // Detect if running in native WKWebView
            if (window.webkit && window.webkit.messageHandlers) {
                console.log('[IrisTracker] ARKit bridge registered (Native iOS detected)');
            }
        }
    }

    /**
     * Initializes the MediaPipe Face Mesh engine.
     * Uses a static promise to ensure only one initialization happens at a time
     * even if multiple instances are created.
     */
    async initialize() {
        if (this.isReady) return true;

        if (!window._irisTrackerInitPromise) {
            window._irisTrackerInitPromise = new Promise((resolve) => {
                try {
                    if (!window.FaceMesh) {
                        resolve(false);
                        return;
                    }

                    const faceMesh = new window.FaceMesh({
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                    });

                    faceMesh.setOptions({
                        maxNumFaces: 1,
                        refineLandmarks: true,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });

                    const timeout = setTimeout(() => {
                        console.error("[IrisTracker] Timeout reached.");
                        resolve(false);
                    }, 60000);

                    // Central results dispatcher
                    faceMesh.onResults((results) => {
                        window._irisTrackerLastResults = results;
                        // Trigger any pending track calls
                        if (window._irisTrackerPendingResolvers) {
                            const resolvers = [...window._irisTrackerPendingResolvers];
                            window._irisTrackerPendingResolvers = [];
                            resolvers.forEach(res => res(results));
                        }
                    });

                    const warmupCheck = setInterval(() => {
                        try {
                            if (faceMesh && typeof faceMesh.send === 'function') {
                                clearInterval(warmupCheck);
                                window._irisTrackerInstance = faceMesh;
                                setTimeout(() => {
                                    clearTimeout(timeout);
                                    console.log("[IrisTracker] Global AI Engine Ready.");
                                    resolve(true);
                                }, 1000);
                            }
                        } catch (e) { }
                    }, 500);

                } catch (err) {
                    console.error("[IrisTracker] Init error:", err);
                    resolve(false);
                }
            });
        }

        const ok = await window._irisTrackerInitPromise;
        if (ok) {
            this.faceMesh = window._irisTrackerInstance;
            this.isReady = true;
        }
        return ok;
    }

    /**
     * Processes a single video frame and returns normalized iris centers.
     * @param {HTMLVideoElement} videoElement 
     * @returns {Object|null}
     */
    async track(videoElement) {
        // PRIORITY 1: Use ARKit data if available (native iOS WKWebView)
        if (this._arkitLatestFrame &&
            (performance.now() - this._arkitLatestFrame._receivedAt) < 50) {

            const d = this._arkitLatestFrame;
            return {
                left: { x: (d.leftEye?.lookRight || 0) * 100, y: (d.leftEye?.lookUp || 0) * 100 },
                right: { x: (d.rightEye?.lookRight || 0) * 100, y: (d.rightEye?.lookUp || 0) * 100 },
                avg: { x: d.gaze?.x ?? 50, y: d.gaze?.y ?? 50 },
                vergenceX: ((d.leftEye?.lookRight || 0) - (d.rightEye?.lookRight || 0)) * 100,
                vergenceY: ((d.leftEye?.lookUp || 0) - (d.rightEye?.lookUp || 0)) * 100,
                faceZ: 0.25, // ARKit provides real depth; normalized proxy
                faceCenter: d.gaze || { x: 50, y: 50 },
                isBlinking: d.isBlinking || false,
                confidence: d.confidence ?? 1.0,
                frameTimestamp: d.timestamp || performance.now(),
                source: 'arkit'
            };
        }

        // PRIORITY 2: MediaPipe fallback (web browser)
        if (!this.faceMesh || !this.isReady) return null;
        if (!videoElement || videoElement.readyState < 2) return null;

        try {
            // Use a promise to wait for the next set of results from the global instance
            const resultPromise = new Promise(resolve => {
                if (!window._irisTrackerPendingResolvers) window._irisTrackerPendingResolvers = [];
                window._irisTrackerPendingResolvers.push(resolve);
            });

            await this.faceMesh.send({ image: videoElement });
            const results = await resultPromise;
            this.lastResults = results;

            if (results && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
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

                // --- 60fps-tuned Clinical Parameters ---
                // Q (process noise): Increased to track fast 400-600 deg/s saccades
                // R (measurement noise): Reduced to prevent blurring of fast signals
                const fps = window.__cameraFPS || 30;
                const fpsScale = fps / 30;

                const newQ = 0.02 * distFactor * fpsScale;
                const newR = 0.8 / distFactor;

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
                    avg: {
                        x: (smoothLeft.x + smoothRight.x) / 2,
                        y: (smoothLeft.y + smoothRight.y) / 2
                    },
                    // NEW: Binocular Vergence (Biomarker for MHE)
                    vergenceX: smoothLeft.x - smoothRight.x,
                    vergenceY: smoothLeft.y - smoothRight.y,
                    faceZ,
                    faceCenter,
                    isBlinking,
                    confidence,
                    frameTimestamp: performance.now()
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

import { KalmanFilter2D } from './KalmanFilter';

/**
 * IrisTracker.js
 * 
 * Clinical-grade eye tracking via MediaPipe Face Mesh.
 * Singleton pattern — one shared WASM engine, multiple consumers OK.
 */

export class IrisTracker {
    constructor() {
        this.isReady = false;
        this.faceMesh = null;
        this.lastResults = null;
        this.lastFaceCenter = null;

        this.leftKalman = new KalmanFilter2D(0.008, 1.2);
        this.rightKalman = new KalmanFilter2D(0.008, 1.2);

        this.calibrationPoints = [];
        this.isCalibrated = false;

        this._arkitLatestFrame = null;
    }

    /**
     * Initializes the MediaPipe Face Mesh engine.
     * Uses a global promise so multiple instances share the same WASM engine.
     */
    async initialize() {
        if (this.isReady) return true;

        if (!window._irisTrackerInitPromise) {
            window._irisTrackerInitPromise = new Promise(async (resolve) => {
                try {
                    // Wait for MediaPipe script tag to load
                    let waitMs = 0;
                    while (!window.FaceMesh && waitMs < 15000) {
                        await new Promise(r => setTimeout(r, 300));
                        waitMs += 300;
                    }

                    if (!window.FaceMesh) {
                        console.error('[IrisTracker] window.FaceMesh not found after 15s');
                        window._irisTrackerStatus = "Script Load Failed";
                        resolve(false);
                        return;
                    }

                    console.log('[IrisTracker] FaceMesh constructor found, loading WASM...');
                    window._irisTrackerStatus = "Loading WASM Engine...";

                    const faceMesh = new window.FaceMesh({
                        locateFile: (file) => {
                            const url = `${window.location.origin}/mediapipe_face_mesh/${file}`;
                            console.log(`[IrisTracker] Loading: ${url}`);
                            return url;
                        }
                    });

                    faceMesh.setOptions({
                        maxNumFaces: 1,
                        refineLandmarks: true,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });

                    // FIX BUG #3: Use pending resolvers so track() waits for THIS frame's result
                    faceMesh.onResults((results) => {
                        window._irisTrackerLastResults = results;

                        if (window._irisTrackerStatus !== "READY") {
                            console.log("[IrisTracker] First frame processed — READY");
                            window._irisTrackerStatus = "READY";
                        }

                        // Resolve any pending track() promises
                        if (window._irisTrackerPendingResolve) {
                            const resolveFn = window._irisTrackerPendingResolve;
                            window._irisTrackerPendingResolve = null;
                            resolveFn(results);
                        }
                    });

                    window._irisTrackerInstance = faceMesh;
                    window._irisTrackerStatus = "WASM Loaded. Waiting for video...";

                    // Give WASM a moment to compile
                    setTimeout(() => {
                        console.log("[IrisTracker] Initialized.");
                        resolve(true);
                    }, 500);

                } catch (err) {
                    console.error("[IrisTracker] Init crash:", err);
                    window._irisTrackerStatus = `CRASH: ${err.message}`;
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
     * Sends a video frame to MediaPipe and waits for THIS frame's result.
     * Returns null if no face found or video not ready.
     */
    async track(videoElement) {
        // Priority 1: ARKit (iOS native bridge)
        if (this._arkitLatestFrame &&
            (performance.now() - this._arkitLatestFrame._receivedAt) < 50) {
            const d = this._arkitLatestFrame;
            return {
                left: { x: (d.leftEye?.lookRight || 0) * 100, y: (d.leftEye?.lookUp || 0) * 100 },
                right: { x: (d.rightEye?.lookRight || 0) * 100, y: (d.rightEye?.lookUp || 0) * 100 },
                avg: { x: d.gaze?.x ?? 50, y: d.gaze?.y ?? 50 },
                vergenceX: ((d.leftEye?.lookRight || 0) - (d.rightEye?.lookRight || 0)) * 100,
                vergenceY: ((d.leftEye?.lookUp || 0) - (d.rightEye?.lookUp || 0)) * 100,
                faceZ: 0.25,
                faceCenter: d.gaze || { x: 50, y: 50 },
                isBlinking: d.isBlinking || false,
                confidence: d.confidence ?? 1.0,
                frameTimestamp: d.timestamp || performance.now(),
                source: 'arkit'
            };
        }

        // Priority 2: MediaPipe (web)
        if (!this.isReady || !this.faceMesh) return null;
        if (!videoElement || videoElement.readyState < 2) return null;
        if (videoElement.videoWidth < 1 || videoElement.videoHeight < 1) return null;

        // FIX BUG #3: Wait for THIS frame's onResults callback
        return new Promise(async (resolve) => {
            // Set up the resolver BEFORE sending so onResults can find it
            window._irisTrackerPendingResolve = (results) => {
                const processed = this._processResults(results);
                resolve(processed);
            };

            try {
                await this.faceMesh.send({ image: videoElement });
            } catch (e) {
                window._irisTrackerPendingResolve = null;
                resolve(null);
                return;
            }

            // Safety timeout — if onResults doesn't fire in 500ms, resolve null
            setTimeout(() => {
                if (window._irisTrackerPendingResolve) {
                    window._irisTrackerPendingResolve = null;
                    resolve(null);
                }
            }, 500);
        });
    }

    /**
     * Processes raw MediaPipe results into normalized tracking data.
     * Extracted to keep track() clean.
     */
    _processResults(results) {
        if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return null;
        }

        const landmarks = results.multiFaceLandmarks[0];
        const leftIris = landmarks[468];
        const rightIris = landmarks[473];

        if (!leftIris || !rightIris) return null;

        // --- Face width (distance proxy) ---
        const faceWidth = Math.sqrt(
            Math.pow(landmarks[454].x - landmarks[234].x, 2) +
            Math.pow(landmarks[454].y - landmarks[234].y, 2)
        );

        // --- Blink detection ---
        const blinkThreshold = 0.035 * faceWidth;
        const leftOpenness = Math.abs(landmarks[159].y - landmarks[145].y);
        const rightOpenness = Math.abs(landmarks[386].y - landmarks[374].y);
        const isBlinking = leftOpenness < blinkThreshold && rightOpenness < blinkThreshold;

        // --- Iris-relative coordinates (distance-invariant) ---
        const lInner = landmarks[33], lOuter = landmarks[133];
        const lWidth = Math.sqrt(Math.pow(lOuter.x - lInner.x, 2) + Math.pow(lOuter.y - lInner.y, 2));
        const lRelX = (leftIris.x - lInner.x) / lWidth;
        const lRelY = (leftIris.y - (lInner.y + lOuter.y) / 2) / lWidth;

        const rInner = landmarks[362], rOuter = landmarks[263];
        const rWidth = Math.sqrt(Math.pow(rOuter.x - rInner.x, 2) + Math.pow(rOuter.y - rInner.y, 2));
        const rRelX = (rightIris.x - rInner.x) / rWidth;
        const rRelY = (rightIris.y - (rInner.y + rOuter.y) / 2) / rWidth;

        // --- Face center ---
        const faceCenter = {
            x: (landmarks[454].x + landmarks[234].x) / 2,
            y: (landmarks[10].y + landmarks[152].y) / 2
        };

        // --- Kalman filtering ---
        const distFactor = Math.min(1.5, Math.max(0.5, faceWidth / 0.25));
        const fps = window.__cameraFPS || 30;
        const newQ = 0.02 * distFactor * (fps / 30);
        const newR = 0.8 / distFactor;

        this.leftKalman.setNoise(newQ, newR);
        this.rightKalman.setNoise(newQ, newR);
        this.leftKalman.predict();
        this.rightKalman.predict();
        this.leftKalman.update([lRelX * 100, lRelY * 100]);
        this.rightKalman.update([rRelX * 100, rRelY * 100]);

        // FIX BUG #1: getPoint() returns {x, y} — use .x and .y, NOT [0] and [1]
        const smoothLeft = this.leftKalman.getPoint();
        const smoothRight = this.rightKalman.getPoint();

        // --- Confidence ---
        let confidence = 1.0;
        if (isBlinking) confidence = 0.0;
        if (faceWidth < 0.1) confidence *= 0.1;

        this.lastFaceCenter = faceCenter;

        return {
            left: { x: smoothLeft.x, y: smoothLeft.y },
            right: { x: smoothRight.x, y: smoothRight.y },
            avg: {
                x: (smoothLeft.x + smoothRight.x) / 2,
                y: (smoothLeft.y + smoothRight.y) / 2
            },
            vergenceX: smoothLeft.x - smoothRight.x,
            vergenceY: smoothLeft.y - smoothRight.y,
            faceZ: faceWidth,
            faceCenter: faceCenter,
            isBlinking: isBlinking,
            confidence: confidence,
            frameTimestamp: performance.now(),
            source: 'mediapipe'
        };
    }

    getGaze(eyePos) {
        if (!eyePos) return null;
        return {
            x: 50 + (eyePos.x - 50) * 8,
            y: 50 + (eyePos.y - 45) * 12
        };
    }
}

export default new IrisTracker();

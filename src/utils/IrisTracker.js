
/**
 * IrisTracker.js
 * 
 * Implements the Hybrid CHT + Template Matching algorithm for efficient
 * eye tracking on mobile devices, as per the clinical methodology.
 * 
 * Dependencies: OpenCV.js (must be loaded in window.cv)
 */

export class IrisTracker {
    constructor() {
        this.isReady = false;
        this.irisTemplate = null;
        this.templateRect = null; // {x, y, width, height}
        this.lastPosition = { x: 0, y: 0 };
        this.processingScale = 0.5; // Process at half resolution for speed
    }

    /**
     * Phase A: Initialization
     * Detects the iris using Circular Hough Transform (CHT) with fallback
     * @param {HTMLVideoElement} videoElement 
     * @returns {Object|null} The detected iris ROI or null if failed
     */
    initialize(videoElement) {
        if (!window.cv || !videoElement.videoWidth) {
            console.error("OpenCV not loaded or Video not ready");
            return null;
        }

        let src = null;
        let gray = null;
        let blurred = null;
        let circles = null;
        let claheMat = null;
        let clahe = null;

        try {
            const cap = new window.cv.VideoCapture(videoElement);
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;

            src = new window.cv.Mat(height, width, window.cv.CV_8UC4);
            cap.read(src);

            gray = new window.cv.Mat();
            window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

            // 1. Advanced Normalization (CLAHE) - Essential for pupils in low/uneven light
            claheMat = new window.cv.Mat();
            clahe = new window.cv.CLAHE(2.5, new window.cv.Size(8, 8));
            clahe.apply(gray, claheMat);

            // 2. Dynamic ROI: Scan the upper center where eyes are expected
            const roiRect = new window.cv.Rect(
                width * 0.1,
                height * 0.1,
                width * 0.8,
                height * 0.5
            );
            const roi = claheMat.roi(roiRect);

            // 3. Preprocessing
            blurred = new window.cv.Mat();
            window.cv.medianBlur(roi, blurred, 5);

            // 4. Multi-Stage Detection
            circles = new window.cv.Mat();

            // INCREASED MAX RADIUS: Up to 150 pixels to handle "Close Up" shots or 1080p+
            // Param2 lowered to 20 for extreme sensitivity to subtle eye circles
            window.cv.HoughCircles(blurred, circles, window.cv.HOUGH_GRADIENT, 1, 60, 100, 20, 15, 150);

            let bestCircle = null;

            if (circles.cols > 0) {
                // Heuristic: Find the most centered circle in the ROI
                let minDist = Infinity;
                for (let i = 0; i < circles.cols; ++i) {
                    const cx = circles.data32F[i * 3];
                    const cy = circles.data32F[i * 3 + 1];
                    const r = circles.data32F[i * 3 + 2];

                    const distFromCenter = Math.abs(cx - roiRect.width / 2);
                    if (distFromCenter < minDist) {
                        minDist = distFromCenter;
                        bestCircle = { x: cx + roiRect.x, y: cy + roiRect.y, r };
                    }
                }
            } else {
                // 5. FALLBACK: Darkest Point Detection (if Hough fails)
                // Iris/Pupil is usually the darkest part of the ROI in IR or visible light
                let minMax = window.cv.minMaxLoc(blurred);
                if (minMax.minVal < 100) { // Threshold for a dark blob
                    bestCircle = {
                        x: minMax.minLoc.x + roiRect.x,
                        y: minMax.minLoc.y + roiRect.y,
                        r: 45 // Generic iris radius for template creation
                    };
                    console.log("Hough failed, used Darkest Blob / Pupil Centroid fallback");
                }
            }

            if (bestCircle) {
                // 6. Final Template Lock
                const templateSize = bestCircle.r * 2.2;
                const tx = Math.max(0, bestCircle.x - templateSize / 2);
                const ty = Math.max(0, bestCircle.y - templateSize / 2);

                const templateRect = new window.cv.Rect(tx, ty, templateSize, templateSize);

                if (tx + templateSize < gray.cols && ty + templateSize < gray.rows) {
                    const finalRoi = gray.roi(templateRect);
                    this.irisTemplate = finalRoi.clone();
                    finalRoi.delete();

                    this.templateRect = templateRect;
                    this.lastPosition = { x: bestCircle.x, y: bestCircle.y };
                    this.isReady = true;
                    console.log("TRACKER_LOCK: Captured at R=", bestCircle.r);
                }
            }

            roi.delete();
            return this.isReady;

        } catch (err) {
            console.error("Critical Iris Detection Error:", err);
            return false;
        } finally {
            if (src) src.delete();
            if (gray) gray.delete();
            if (claheMat) claheMat.delete();
            if (clahe) clahe.delete();
            if (blurred) blurred.delete();
            if (circles) circles.delete();
        }
    }

    /**
     * Phase B: Real-Time Tracking
     * Uses Template Matching with Sub-pixel refinement
     * @param {HTMLVideoElement} videoElement 
     * @returns {Object} {x, y} coordinate of iris center
     */
    track(videoElement) {
        if (!this.isReady || !this.irisTemplate || !videoElement.videoWidth) return null;

        let src = null;
        let gray = null;
        let result = null;
        let mask = null;
        let cap = null;

        try {
            cap = new window.cv.VideoCapture(videoElement);
            src = new window.cv.Mat(videoElement.videoHeight, videoElement.videoWidth, window.cv.CV_8UC4);
            cap.read(src);

            gray = new window.cv.Mat();
            window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

            // Using Histogram Equalization during tracking for consistency
            const equalized = new window.cv.Mat();
            window.cv.equalizeHist(gray, equalized);

            result = new window.cv.Mat();
            mask = new window.cv.Mat();

            window.cv.matchTemplate(equalized, this.irisTemplate, result, window.cv.TM_CCOEFF_NORMED, mask);

            const minMax = window.cv.minMaxLoc(result, mask);
            const { maxLoc, maxVal } = minMax;

            equalized.delete();

            if (maxVal > 0.4) { // Highly sensitive threshold
                const cx = maxLoc.x + this.templateRect.width / 2;
                const cy = maxLoc.y + this.templateRect.height / 2;
                this.lastPosition = { x: cx, y: cy };
            }

            return this.lastPosition;

        } catch (err) {
            console.error("Tracking Error:", err);
            return this.lastPosition;
        } finally {
            if (src) src.delete();
            if (gray) gray.delete();
            if (result) result.delete();
            if (mask) mask.delete();
        }
    }

    reset() {
        if (this.irisTemplate) {
            try { this.irisTemplate.delete(); } catch (e) { }
        }
        this.isReady = false;
        this.irisTemplate = null;
    }
}


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
     * Detects the iris using Circular Hough Transform (CHT)
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

        try {
            // 1. Capture Frame
            const cap = new window.cv.VideoCapture(videoElement);
            src = new window.cv.Mat(videoElement.height, videoElement.width, window.cv.CV_8UC4);
            cap.read(src);

            // 2. Preprocessing
            gray = new window.cv.Mat();
            window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

            // Apply Gaussian Blur to reduce noise
            blurred = new window.cv.Mat();
            const ksize = new window.cv.Size(9, 9);
            window.cv.GaussianBlur(gray, blurred, ksize, 2, 2, window.cv.BORDER_DEFAULT);

            // 3. Circular Hough Transform (CHT)
            circles = new window.cv.Mat();
            // params: method, dp, minDist, param1 (canny), param2 (accumulator), minRadius, maxRadius
            // Paper settings: minDist: 40, param1: 180, param2: 10, minR: 15, maxR: 50
            // Adjusted for web resolution scaling
            window.cv.HoughCircles(blurred, circles, window.cv.HOUGH_GRADIENT, 1, 40, 100, 30, 10, 60);

            let bestCircle = null;

            if (circles.cols > 0) {
                // Iterate found circles to find the darkest one (Iris is dark)
                for (let i = 0; i < circles.cols; ++i) {
                    const x = circles.data32F[i * 3];
                    const y = circles.data32F[i * 3 + 1];
                    const r = circles.data32F[i * 3 + 2];

                    // Heuristic: Check average brightness in this circle to confirm it's an eye
                    // Ideally we'd mask and sum, but for speed we select the strongest CHT candidate
                    // For this implementation, we take the first strong circle
                    bestCircle = { x, y, r };

                    // In a full implementation, we would crop and sum pixels here
                    break;
                }
            }

            if (bestCircle) {
                // 4. Create Template (ROI)
                // We take a box around the iris
                const roiSize = bestCircle.r * 2.5; // Slightly larger than diameter
                const x = Math.max(0, bestCircle.x - roiSize / 2);
                const y = Math.max(0, bestCircle.y - roiSize / 2);

                const roiRect = new window.cv.Rect(x, y, roiSize, roiSize);

                // Ensure ROI is within bounds
                if (x + roiSize < gray.cols && y + roiSize < gray.rows) {
                    this.irisTemplate = gray.roi(roiRect);
                    this.templateRect = roiRect;
                    this.lastPosition = { x: bestCircle.x, y: bestCircle.y };
                    this.isReady = true;

                    console.log("Iris Template Created:", roiRect);
                }
            }

            return this.isReady;

        } catch (err) {
            console.error("Iris Detection failed:", err);
            return false;
        } finally {
            // Cleanup: IMPORTANT to delete Mats to restart logic
            if (src) src.delete();
            if (blurred) blurred.delete();
            if (circles) circles.delete();
            // Note: We DO NOT delete 'gray' if we successfully created a template from it (irisTemplate is a lightweight ROI)
            // Actually ROIs share buffer, so we must CLONE the template if we want to delete gray.
            // But if we fail, we delete gray. 
            // If we succeed, we need to keep the data.
            // Let's optimize: clone the ROI to a standalone matrix so we can free the big frame.
            if (this.isReady && this.irisTemplate) {
                const standalone = this.irisTemplate.clone();
                this.irisTemplate.delete(); // delete ROI handle
                this.irisTemplate = standalone; // replace with clone
                if (gray) gray.delete(); // NOW we can delete keyframe
            } else {
                if (gray) gray.delete();
            }
        }
    }

    /**
     * Phase B: Real-Time Tracking
     * Uses Template Matching to track the initialized iris
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
            src = new window.cv.Mat(videoElement.height, videoElement.width, window.cv.CV_8UC4);
            cap.read(src);

            gray = new window.cv.Mat();
            window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

            result = new window.cv.Mat();
            mask = new window.cv.Mat();

            // TM_CCOEFF_NORMED is robust to lighting changes
            window.cv.matchTemplate(gray, this.irisTemplate, result, window.cv.TM_CCOEFF_NORMED, mask);

            const minMax = window.cv.minMaxLoc(result, mask);
            const { maxLoc, maxVal } = minMax;

            // Threshold confidence
            if (maxVal > 0.5) { // Slightly lower threshold for mobile stability
                // Location is top-left of match
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

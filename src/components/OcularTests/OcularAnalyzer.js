
/**
 * OcularAnalyzer.js
 * 
 * Clinical Grade Ocular Motor Analysis for MHE Detection.
 * Uses personalized calibration data to map iris vectors to screen coordinates.
 */

export const analyzeTestResults = (testId, rawData, calibrationData) => {
    if (!rawData || rawData.length === 0) return { score: 0, metric: 'No Data', status: 'Inconclusive' };

    const mapping = getDiagnosticMapping(calibrationData);

    // 1. Mandatory Calibration Guard (P2)
    if (!mapping.isValid) {
        return {
            score: null,
            metric: 'UNCALIBRATED',
            status: 'Calibration Required',
            dataQuality: 0,
            rawData: [],
            requiresCalibration: true
        };
    }

    // 2. Sample raw data for visualization (D11)
    const sampledGaze = [];
    const step = Math.max(1, Math.floor(rawData.length / 100)); // Sample ~100 points
    for (let i = 0; i < rawData.length; i += step) {
        sampledGaze.push(getCalibratedGaze(rawData[i], mapping));
    }

    // 3. Calculate actual data quality (D4/D6)
    // Valid = not blinking and tracking engine returned valid center
    const validFrames = rawData.filter(d => !d.isBlinking && d.eyeX !== undefined && (d.confidence === undefined || d.confidence > 0.3)).length;
    const dataQuality = Math.round((validFrames / rawData.length) * 100);

    let results;
    switch (testId) {
        case 'fix':
            results = analyzeFixation(rawData, mapping);
            break;
        case 'mgst':
            results = analyzeMGST(rawData, mapping);
            break;
        case 'ast':
            results = analyzeAST(rawData, mapping);
            break;
        case 'spt':
            results = analyzeSPT(rawData, mapping);
            break;
        case 'vgst':
            results = analyzeVGST(rawData, mapping);
            break;
        default:
            results = { score: 0, metric: 'Unknown Test', status: 'N/A' };
    }

    return {
        ...results,
        rawData: sampledGaze,
        dataQuality: Math.min(100, Math.max(0, dataQuality))
    };
};

/**
 * Derives calibration mapping from 5-point calibration.
 * Uses 2nd-degree polynomial regression for nonlinear edge correction:
 *   screenX = a0 + a1*ex + a2*ey + a3*ex^2 + a4*ey^2 + a5*ex*ey
 *   screenY = b0 + b1*ex + b2*ey + b3*ex^2 + b4*ey^2 + b5*ex*ey
 * Falls back to affine (linear) if polynomial solve fails.
 */
const INVALID_MAPPING = { isValid: false, cx: 50, cy: 50, sx: 5.0, sy: 7.0, mode: 'none' };

const getDiagnosticMapping = (cal) => {
    if (!cal || cal.length < 5) return INVALID_MAPPING;

    const center = cal.find(p => p.screen.x === 50 && p.screen.y === 50);
    const tl = cal.find(p => p.screen.x === 20 && p.screen.y === 20);
    const tr = cal.find(p => p.screen.x === 80 && p.screen.y === 20);
    const bl = cal.find(p => p.screen.x === 20 && p.screen.y === 80);
    const br = cal.find(p => p.screen.x === 80 && p.screen.y === 80);

    if (!center || !tl || !tr || !bl || !br) return INVALID_MAPPING;

    const eyeDx = Math.abs(tr.eye.x - tl.eye.x);
    const eyeDy = Math.abs(bl.eye.y - tl.eye.y);

    if (eyeDx < 0.01 || eyeDy < 0.01) {
        console.warn('[Calibration] Eye delta too small — invalid calibration');
        return INVALID_MAPPING;
    }

    // --- Polynomial Calibration (P3) ---
    // Fit 2nd-degree polynomial: screen = f(eyeX, eyeY)
    const points = [center, tl, tr, bl, br];
    const polyCoeffsX = fitPolynomial2D(points, 'x');
    const polyCoeffsY = fitPolynomial2D(points, 'y');

    if (polyCoeffsX && polyCoeffsY) {
        console.log('[Calibration] Polynomial mapping active (2nd-degree, 5-point)');
        return {
            isValid: true,
            mode: 'polynomial',
            polyX: polyCoeffsX,
            polyY: polyCoeffsY
        };
    }

    // Fallback: Linear affine
    console.warn('[Calibration] Polynomial fit failed — using affine fallback');
    const rawSx = (80 - 20) / eyeDx;
    const rawSy = (80 - 20) / eyeDy;

    return {
        isValid: true,
        mode: 'affine',
        cx: center.eye.x,
        cy: center.eye.y,
        sx: Math.min(Math.max(rawSx, 2), 100),
        sy: Math.min(Math.max(rawSy, 2), 100)
    };
};

/**
 * Fits a 2nd-degree polynomial: target = a0 + a1*ex + a2*ey + a3*ex^2 + a4*ey^2 + a5*ex*ey
 * Uses Ordinary Least Squares (Normal Equation: A^T * A * c = A^T * b)
 * @param {Array} points - calibration points with .screen and .eye
 * @param {string} axis - 'x' or 'y' for screen coordinate
 * @returns {Array|null} [a0, a1, a2, a3, a4, a5] or null on failure
 */
const fitPolynomial2D = (points, axis) => {
    const n = points.length;
    if (n < 5) return null;

    // Build design matrix A (n x 6) and target vector b (n x 1)
    // Each row: [1, ex, ey, ex^2, ey^2, ex*ey]
    const A = [];
    const b = [];
    for (const p of points) {
        const ex = p.eye.x;
        const ey = p.eye.y;
        A.push([1, ex, ey, ex * ex, ey * ey, ex * ey]);
        b.push(axis === 'x' ? p.screen.x : p.screen.y);
    }

    // Compute A^T * A (6x6) and A^T * b (6x1)
    const cols = 6;
    const ATA = Array.from({ length: cols }, () => new Array(cols).fill(0));
    const ATb = new Array(cols).fill(0);

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < cols; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) sum += A[k][i] * A[k][j];
            ATA[i][j] = sum;
        }
        let sum = 0;
        for (let k = 0; k < n; k++) sum += A[k][i] * b[k];
        ATb[i] = sum;
    }

    // Solve via Gaussian elimination with partial pivoting
    const coeffs = solveLinearSystem(ATA, ATb);
    if (!coeffs) return null;

    // Sanity check: Evaluate at center calibration point
    const centerPt = points.find(p => p.screen.x === 50 && p.screen.y === 50);
    if (centerPt) {
        const predicted = evalPoly(coeffs, centerPt.eye.x, centerPt.eye.y);
        const expected = axis === 'x' ? 50 : 50;
        if (Math.abs(predicted - expected) > 15) {
            console.warn(`[Calibration] Polynomial center error too high: ${predicted.toFixed(1)} vs ${expected}`);
            return null;
        }
    }

    return coeffs;
};

/**
 * Evaluates 2nd-degree polynomial: a0 + a1*x + a2*y + a3*x^2 + a4*y^2 + a5*x*y
 */
const evalPoly = (c, x, y) => {
    return c[0] + c[1] * x + c[2] * y + c[3] * x * x + c[4] * y * y + c[5] * x * y;
};

/**
 * Solves Ax = b using Gaussian elimination with partial pivoting.
 * @param {Array<Array<number>>} A - n×n matrix (will be mutated)
 * @param {Array<number>} b - n-vector (will be mutated)
 * @returns {Array<number>|null} solution vector or null
 */
const solveLinearSystem = (A, b) => {
    const n = A.length;
    // Augment
    for (let i = 0; i < n; i++) A[i].push(b[i]);

    for (let col = 0; col < n; col++) {
        // Partial pivoting
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
        }
        [A[col], A[maxRow]] = [A[maxRow], A[col]];

        if (Math.abs(A[col][col]) < 1e-12) return null; // Singular

        // Eliminate below
        for (let row = col + 1; row < n; row++) {
            const factor = A[row][col] / A[col][col];
            for (let j = col; j <= n; j++) A[row][j] -= factor * A[col][j];
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = A[i][n];
        for (let j = i + 1; j < n; j++) x[i] -= A[i][j] * x[j];
        x[i] /= A[i][i];
    }
    return x;
};

const getDistance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

/**
 * Maps raw eye coordinates to screen coordinates using calibration.
 * Dispatches to polynomial or affine based on calibration mode.
 */
const getCalibratedGaze = (pt, m) => {
    if (m.mode === 'polynomial') {
        return {
            x: evalPoly(m.polyX, pt.eyeX, pt.eyeY),
            y: evalPoly(m.polyY, pt.eyeX, pt.eyeY)
        };
    }
    // Affine fallback
    return {
        x: 50 + (pt.eyeX - m.cx) * m.sx,
        y: 50 + (pt.eyeY - m.cy) * m.sy
    };
};

/**
 * FIXATION: Measurement of microsaccades and gaze drift
 */
/**
 * FIXATION: Measurement of microsaccades and gaze drift (Precision over Accuracy)
 * Uses Centroid-based stability to ignore constant calibration offsets.
 */
const analyzeFixation = (data, m) => {
    // Filter out very low confidence for centroid
    const validData = data.filter(d => !d.isBlinking && (d.confidence === undefined || d.confidence > 0.4));
    if (validData.length < 15) return { score: 0, metric: 'Insufficient Data', status: 'Retest Required' };

    const gazes = validData.map(pt => ({
        ...getCalibratedGaze(pt, m),
        conf: pt.confidence !== undefined ? pt.confidence : 1.0
    }));

    // 1. Calculate Robust Centroid (Weighted)
    const totalConf = gazes.reduce((sum, p) => sum + p.conf, 0);
    const centroidX = gazes.reduce((sum, p) => sum + p.x * p.conf, 0) / (totalConf || 1);
    const centroidY = gazes.reduce((sum, p) => sum + p.y * p.conf, 0) / (totalConf || 1);

    // 2. Calculate Deviation with Outlier Rejection
    const deviations = gazes.map(g => getDistance(g.x, g.y, centroidX, centroidY));
    // Sort and remove the top 10% outliers (blink recovery, sudden head movement)
    deviations.sort((a, b) => a - b);
    const trimmedDeviations = deviations.slice(0, Math.floor(deviations.length * 0.9));

    const avgStability = trimmedDeviations.reduce((a, b) => a + b, 0) / trimmedDeviations.length;

    // 3. Scoring (Clinical Norms for Webcam)
    // Hardware noise floor is typically ~3-5% for generic webcams.
    // We treat anything below 6% as near-perfect for this hardware.
    const noiseFloor = 3.0; // % screen deviation
    const adjustedStability = Math.max(0, avgStability - noiseFloor);

    // Formula: Drops from 100 fairly slowly until it hits critical threshold.
    // Below 15% deviation is generally acceptable for healthy subjets on webcams.
    const score = Math.max(0, 100 - (adjustedStability * 2.5));

    return {
        score: Math.round(score),
        metric: `Stability: ${avgStability.toFixed(2)}%`,
        status: score > 75 ? 'Optimal Fixation' : (score > 60 ? 'Stable' : (score > 40 ? 'Borderline Drift' : 'Clinical Follow-up Suggested'))
    };
};

/**
 * MGST: Working Memory & Saccadic Latency
 * Detects response phase transitions using state machine, not narrow time windows.
 */
const analyzeMGST = (data, m) => {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    const startTime = data[0].time;
    const cycleDur = 4500; // ms per cycle (peripheral + center + response)
    const responsePhaseStart = 3000; // ms into cycle when target disappears

    let trials = 0;
    let latencies = [];
    let inResponsePhase = false;
    let responsePhaseEntryTime = 0;
    let saccadeDetected = false;

    data.forEach((pt, i) => {
        const t = pt.time - startTime;
        const cycleOffset = t % cycleDur;
        const isResponsePhase = cycleOffset >= responsePhaseStart;

        // Detect entry into response phase
        if (isResponsePhase && !inResponsePhase) {
            inResponsePhase = true;
            responsePhaseEntryTime = pt.time;
            saccadeDetected = false;
            trials++;
        }
        if (!isResponsePhase && inResponsePhase) {
            inResponsePhase = false;
        }

        // Detect saccade during response phase
        if (inResponsePhase && !saccadeDetected) {
            const elapsed = pt.time - responsePhaseEntryTime;
            // Physiological minimum: no human can saccade in <80ms
            // Responses faster than this are noise artifacts, not real saccades
            if (elapsed >= 80) {
                const gaze = getCalibratedGaze(pt, m);
                if (Math.abs(gaze.x - 50) > 8) {
                    latencies.push(elapsed);
                    saccadeDetected = true;
                }
            }
        }
    });

    const avgLat = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 500;

    // Median vergence as extra clinical context (D11/D14)
    const validVergence = data.filter(d => d.vergenceX !== undefined).map(d => Math.abs(d.vergenceX));
    const avgVergence = validVergence.length > 0 ? validVergence.reduce((a, b) => a + b, 0) / validVergence.length : 0;

    // Score: Refined for hardware lag + Clinical MGST Norms.
    // Healthy clinical MGST (Webcam) usually falls in 280-450ms range.
    // Penalty floor at 280ms, steep drop above 500ms
    const latScore = Math.max(0, 100 - Math.max(0, avgLat - 280) * 0.15);
    const completionRate = trials > 0 ? Math.min(latencies.length / trials, 1) : 0;
    const score = Math.round(latScore * (0.6 + 0.4 * completionRate));

    return {
        score: Math.max(0, Math.min(100, score)),
        metric: `Lat: ${Math.round(avgLat)}ms | Vergence: ${avgVergence.toFixed(2)}%`,
        status: score > 70 ? 'Normal Memory-Response' : (score > 45 ? 'Borderline' : 'Impaired Response')
    };
};

/**
 * AST: Inhibitory Control
 * Uses relative gaze deviation from center to determine saccade direction.
 */
const analyzeAST = (data, m) => {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    let totalResponses = 0;
    let prosaccadeErrors = 0;
    let saccadeDetected = false;
    let lastTargetX = 50;
    let stimulusTime = 0;

    data.forEach((pt) => {
        const isStimActive = pt.targetVisible && Math.abs(pt.targetX - 50) > 10;

        if (isStimActive && pt.targetX !== lastTargetX) {
            lastTargetX = pt.targetX;
            stimulusTime = pt.time;
            saccadeDetected = false;
            totalResponses++;
        }

        if (isStimActive && !saccadeDetected && stimulusTime > 0) {
            const elapsed = pt.time - stimulusTime;
            // Physiological window for antisaccades: 100-800ms
            if (elapsed > 100 && elapsed < 800) {
                const gaze = getCalibratedGaze(pt, m);
                const targetSide = lastTargetX < 50 ? -1 : 1;
                const gazeSide = gaze.x < 50 ? -1 : 1;

                // Error: Looked AT the target side instead of AWAY
                if (gazeSide === targetSide && Math.abs(gaze.x - 50) > 10) {
                    prosaccadeErrors++;
                    saccadeDetected = true;
                } else if (gazeSide === -targetSide && Math.abs(gaze.x - 50) > 10) {
                    // Correct: Looked away
                    saccadeDetected = true;
                }
            }
        }
    });

    const errorRate = totalResponses > 0 ? prosaccadeErrors / totalResponses : 0;
    // Clinical threshold: Errors above 30% are indicative of dysfunction
    const score = Math.max(0, 100 - (errorRate * 120));

    return {
        score: Math.round(score),
        metric: `Errors: ${Math.round(errorRate * 100)}% (${prosaccadeErrors}/${totalResponses})`,
        status: errorRate < 0.20 ? 'Normal Inhibition' : (errorRate < 0.35 ? 'Borderline' : 'Impaired Inhibition')
    };
};

/**
 * SPT: Velocity Gain Calculation
 * Clamps velocity ratio to prevent explosion from near-zero dt.
 */
const analyzeSPT = (data, m) => {
    if (data.length < 20) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    let gains = [];
    const MIN_DT = 16; // Minimum 16ms between frames (60fps cap)
    // Target moves at ~8% screen width per second = 0.008% per ms
    // Threshold set to 0.005 to catch most of the pursuit phase
    const MIN_TARGET_VEL = 0.005; // Minimum target velocity to count (% per ms)

    for (let i = 5; i < data.length - 5; i++) {
        // Skip low confidence data points
        if (data[i].confidence !== undefined && data[i].confidence < 0.5) continue;

        const dt = Math.max(data[i].time - data[i - 1].time, MIN_DT);

        const targetVel = (data[i].targetX - data[i - 1].targetX) / dt;
        if (Math.abs(targetVel) < MIN_TARGET_VEL) continue; // Skip turnaround/static

        const gazeCurr = getCalibratedGaze(data[i], m);
        const gazePrev = getCalibratedGaze(data[i - 1], m);
        const eyeVel = (gazeCurr.x - gazePrev.x) / dt;

        const gain = Math.abs(eyeVel / targetVel);

        // Clamp gain to [0, 3] — anything outside is noise
        if (gain >= 0 && gain <= 3.0) {
            gains.push(gain);
        }
    }

    if (gains.length < 5) {
        return { score: 60, metric: 'Gain: N/A (low data)', status: 'Retest Required' };
    }

    // Use median for robustness against outliers
    gains.sort((a, b) => a - b);
    const medianGain = gains[Math.floor(gains.length / 2)];

    // Score: Gain of 1.0 is perfect. Deviations penalized.
    // Relaxed penalty for webcam: 0.8 to 1.2 is considered excellent (~90+)
    const score = Math.max(0, 100 - Math.abs(1 - medianGain) * 60);

    return {
        score: Math.round(score),
        metric: `Gain: ${medianGain.toFixed(2)} (n=${gains.length})`,
        status: medianGain > 0.65 && medianGain < 1.35 ? 'Normal Pursuit' : 'Saccadic Pursuit'
    };
};

/**
 * VGST: Peak Velocity & Latency
 * Uses state machine for jump detection with minimum inter-jump interval.
 */
const analyzeVGST = (data, m) => {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    let latencies = [];
    let missedSaccades = 0;
    let totalTrials = 0;
    let lastTargetX = data[0]?.targetX ?? 50;
    let jumpTime = 0;
    let waitingForSaccade = false;
    const MIN_JUMP_INTERVAL = 600;

    data.forEach((pt) => {
        if (Math.abs(pt.targetX - lastTargetX) > 10 &&
            (jumpTime === 0 || pt.time - jumpTime > MIN_JUMP_INTERVAL)) {
            lastTargetX = pt.targetX;
            jumpTime = pt.time;
            waitingForSaccade = true;
            totalTrials++;
        }

        if (waitingForSaccade && jumpTime > 0) {
            const elapsed = pt.time - jumpTime;

            if (elapsed > 80 && elapsed < 600) {
                const gaze = getCalibratedGaze(pt, m);
                const targetSide = lastTargetX < 50 ? -1 : 1;
                const gazeSide = gaze.x < 50 ? -1 : 1;

                if (gazeSide === targetSide && Math.abs(gaze.x - 50) > 8) {
                    latencies.push(elapsed);
                    waitingForSaccade = false;
                }
            } else if (elapsed >= 600) {
                missedSaccades++;
                waitingForSaccade = false;
            }
        }
    });

    if (latencies.length < 3) return { score: 30, metric: 'Too few valid saccades', status: 'Retest Required' };

    latencies.sort((a, b) => a - b);
    const medianLat = latencies[Math.floor(latencies.length / 2)];
    const correctRate = latencies.length / totalTrials;

    const latScore = Math.max(0, 100 - Math.max(0, medianLat - 180) * 0.18);
    const score = Math.round(latScore * (0.7 + 0.3 * correctRate));

    return {
        score: Math.max(0, Math.min(100, score)),
        metric: `Median: ${Math.round(medianLat)}ms | ${latencies.length}/${totalTrials} hits | ${missedSaccades} missed`,
        status: medianLat < 300 && correctRate > 0.7 ? 'Normal Reflex' : (medianLat < 400 ? 'Borderline' : 'Delayed Response')
    };
};


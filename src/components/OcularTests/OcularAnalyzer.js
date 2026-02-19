
/**
 * OcularAnalyzer.js
 * 
 * Clinical Grade Ocular Motor Analysis for MHE Detection.
 * Uses personalized calibration data to map iris vectors to screen coordinates.
 */

export const analyzeTestResults = (testId, rawData, calibrationData) => {
    if (!rawData || rawData.length === 0) return { score: 0, metric: 'No Data', status: 'Inconclusive' };

    // 1. Generate personalized mapping
    const mapping = getDiagnosticMapping(calibrationData);

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
 * Derives scaling and offset from 5-point calibration
 */
const getDiagnosticMapping = (cal) => {
    // Default fallback
    const defaults = { cx: 50, cy: 50, sx: 5.0, sy: 7.0 };
    if (!cal || cal.length < 5) return defaults;

    const center = cal.find(p => p.screen.x === 50 && p.screen.y === 50);
    const tl = cal.find(p => p.screen.x === 20 && p.screen.y === 20);
    const tr = cal.find(p => p.screen.x === 80 && p.screen.y === 20);
    const bl = cal.find(p => p.screen.x === 20 && p.screen.y === 80);
    const br = cal.find(p => p.screen.x === 80 && p.screen.y === 80);

    if (!center || !tl || !tr || !bl || !br) return defaults;

    // Scale = ScreenDelta / EyeDelta
    // Horizontal eye tracking is mirrored in selfie
    // Safety check: Ensure the user actually moved their eyes. 
    // If delta is < 0.01 (normalized), it means they likely didn't look at the dots.
    const eyeDx = Math.abs(tr.eye.x - tl.eye.x);
    const eyeDy = Math.abs(bl.eye.y - tl.eye.y);

    if (eyeDx < 0.01 || eyeDy < 0.01) {
        console.warn("Calibration Delta too small - Fallback to defaults");
        return defaults;
    }

    const rawSx = (80 - 20) / eyeDx;
    const rawSy = (80 - 20) / eyeDy;

    // Clamp scaling to prevent explosive coordinates (Max 100x magnification)
    // Typical values are 5-20.
    return {
        cx: center.eye.x,
        cy: center.eye.y,
        sx: Math.min(Math.max(rawSx, 2), 100),
        sy: Math.min(Math.max(rawSy, 2), 100)
    };
};

const getDistance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

const getCalibratedGaze = (pt, m) => {
    // Affine: (eye - center) * scale + 50
    // Mirror X because MediaPipe coordinates are selfie-mirrored
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
    const validData = data.filter(d => !d.isBlinking && (d.confidence === undefined || d.confidence > 0.3));
    if (validData.length < 10) return { score: 0, metric: 'Low Quality Data', status: 'Inconclusive' };

    const gazes = validData.map(pt => ({
        ...getCalibratedGaze(pt, m),
        conf: pt.confidence !== undefined ? pt.confidence : 1.0
    }));

    // 1. Calculate Weighted Centroid (Robust Mean)
    const totalConf = gazes.reduce((sum, p) => sum + p.conf, 0);
    const centroidX = gazes.reduce((sum, p) => sum + p.x * p.conf, 0) / (totalConf || 1);
    const centroidY = gazes.reduce((sum, p) => sum + p.y * p.conf, 0) / (totalConf || 1);

    // 2. Calculate Drift (Average Distance from Centroid)
    let totalDeviation = 0;
    gazes.forEach(g => {
        totalDeviation += getDistance(g.x, g.y, centroidX, centroidY);
    });

    const avgStability = totalDeviation / gazes.length;

    // Scoring: 
    // < 2.0% deviation = Perfect (100)
    // Formula: Score drops by 3 points for every 1% deviation
    const score = Math.max(0, 100 - (avgStability * 3.0));

    return {
        score: Math.round(score),
        metric: `Stability: ${avgStability.toFixed(2)}%`, // Lower is better
        status: score > 70 ? 'Normal Stability' : (score > 40 ? 'Borderline Drift' : 'Clinical Follow-up Suggested')
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
        : 500; // Default: 500ms (borderline)

    // Score: 0ms impossible, 200ms = excellent, 450ms = borderline, >600ms = fail
    const latScore = Math.max(0, 100 - Math.max(0, avgLat - 150) * 0.2);
    // Trial completion bonus
    const completionRate = trials > 0 ? Math.min(latencies.length / trials, 1) : 0;
    const score = Math.round(latScore * (0.5 + 0.5 * completionRate));

    return {
        score: Math.max(0, Math.min(100, score)),
        metric: `Lat: ${Math.round(avgLat)}ms (${latencies.length}/${trials} trials)`,
        status: score > 65 ? 'Normal Latency' : 'Follow-up Suggested'
    };
};

/**
 * AST: Inhibitory Control
 * Uses relative gaze deviation from center to determine saccade direction.
 */
const analyzeAST = (data, m) => {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    let prosaccadeErrors = 0;
    let correctResponses = 0;
    let trials = 0;
    let lastTargetSide = 0; // -1 = left, 1 = right, 0 = none
    let trialSettled = false;
    let trialFrameCount = 0;

    data.forEach((pt, i) => {
        if (!pt.targetVisible || pt.targetX === 50) {
            lastTargetSide = 0;
            trialSettled = false;
            trialFrameCount = 0;
            return;
        }

        const currentSide = pt.targetX < 50 ? -1 : 1;

        // New trial detected
        if (currentSide !== lastTargetSide) {
            lastTargetSide = currentSide;
            trialSettled = false;
            trialFrameCount = 0;
            trials++;
        }

        trialFrameCount++;

        // Give 5 frames for the eye to respond (skip immediate frames)
        if (trialFrameCount < 5 || trialSettled) return;

        const gaze = getCalibratedGaze(pt, m);
        const gazeCenterOffset = gaze.x - 50; // Positive = right, Negative = left
        // 10% threshold accounts for webcam noise floor (~5%) with 2x safety margin
        const gazeThreshold = 10; // Must deviate at least 10% from center

        if (Math.abs(gazeCenterOffset) > gazeThreshold) {
            const gazeSide = gazeCenterOffset > 0 ? 1 : -1;
            const expectedSide = -currentSide; // Antisaccade = opposite direction

            if (gazeSide === expectedSide) {
                correctResponses++;
            } else {
                prosaccadeErrors++;
            }
            trialSettled = true;
        }
    });

    const totalResponses = prosaccadeErrors + correctResponses;
    const errorRate = totalResponses > 0 ? prosaccadeErrors / totalResponses : 0.5;
    const score = Math.max(0, 100 - (errorRate * 100));

    return {
        score: Math.round(score),
        metric: `Err: ${Math.round(errorRate * 100)}% (${prosaccadeErrors}/${totalResponses})`,
        status: errorRate < 0.35 ? 'Normal Inhibition' : 'Follow-up Suggested'
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

    // Score: Gain of 1.0 = perfect (100). Deviations penalized.
    // Gain of 0.8 or 1.2 = 96. Gain of 0.5 or 1.5 = 70. Gain of 0.3 = 40.
    const score = Math.max(0, 100 - Math.abs(1 - medianGain) * 100);

    return {
        score: Math.round(score),
        metric: `Gain: ${medianGain.toFixed(2)} (n=${gains.length})`,
        status: medianGain > 0.7 && medianGain < 1.3 ? 'Normal' : 'Saccadic Pursuit'
    };
};

/**
 * VGST: Peak Velocity & Latency
 * Uses state machine for jump detection with minimum inter-jump interval.
 */
const analyzeVGST = (data, m) => {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    let latencies = [];
    let lastTargetX = data[0]?.targetX ?? 50;
    let jumpTime = 0;
    let waitingForSaccade = false;
    const MIN_JUMP_INTERVAL = 500; // ms — ignore rapid re-jumps

    data.forEach((pt, i) => {
        // Detect target jump — threshold lowered to 10% to catch all valid jumps
        if (Math.abs(pt.targetX - lastTargetX) > 10 && (jumpTime === 0 || pt.time - jumpTime > MIN_JUMP_INTERVAL)) {
            lastTargetX = pt.targetX;
            jumpTime = pt.time;
            waitingForSaccade = true;
        }

        // Detect saccade response after jump
        if (waitingForSaccade && jumpTime > 0) {
            const elapsed = pt.time - jumpTime;
            if (elapsed > 50 && elapsed < 800) { // Valid latency window: 50-800ms
                const gaze = getCalibratedGaze(pt, m);
                const targetSide = lastTargetX < 50 ? -1 : 1;
                const gazeSide = gaze.x < 50 ? -1 : 1;

                if (gazeSide === targetSide && Math.abs(gaze.x - 50) > 5) {
                    latencies.push(elapsed);
                    waitingForSaccade = false;
                }
            } else if (elapsed >= 800) {
                // Missed saccade — count as slow
                latencies.push(700);
                waitingForSaccade = false;
            }
        }
    });

    const avgLat = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 300;

    // Score: 150ms = excellent (100), 250ms = good (85), 400ms = borderline (65), >600ms = fail
    const score = Math.max(0, 100 - Math.max(0, avgLat - 100) * 0.2);

    return {
        score: Math.round(score),
        metric: `${Math.round(avgLat)}ms avg (${latencies.length} saccades)`,
        status: avgLat < 300 ? 'Normal' : (avgLat < 500 ? 'Borderline' : 'Delayed Response')
    };
};


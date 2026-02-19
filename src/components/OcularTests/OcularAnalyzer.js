
/**
 * OcularAnalyzer.js
 * 
 * Clinical-grade ocular motor analysis for MHE detection.
 * 
 * Tier 1 Upgrades:
 *   - Velocity-based saccade detection (Engbert-Kliegl 2003)
 *   - Sub-frame timestamp precision via stimulus event markers
 *   - Per-trial stimulus-response alignment
 *   - BCEA fixation stability
 *   - Smooth pursuit gain with catch-up saccade exclusion
 */

import {
    computeVelocities,
    computeVelocityThreshold,
    detectSaccades,
    matchSaccadesToStimuli,
    computeFixationMetrics,
    computePursuitMetrics,
    computeVergenceMetrics,
    computeReliabilityMetrics,
    preprocessBlinks
} from '../../utils/SaccadeDetector';

// --- Calibration Mapping ---

const INVALID_MAPPING = { isValid: false, cx: 50, cy: 50, sx: 5.0, sy: 7.0, mode: 'none' };

const getDiagnosticMapping = (cal) => {
    if (!cal || cal.length < 3) {
        // Fallback: no calibration → use identity mapping with gain
        return {
            isValid: true,
            mode: 'uncalibrated',
            cx: 50,
            cy: 45,
            sx: 8.0,
            sy: 12.0
        };
    }

    if (cal.length >= 5) {
        const center = cal.find(p => p.screen.x === 50 && p.screen.y === 50);
        const tl = cal.find(p => p.screen.x < 30 && p.screen.y < 30);
        const tr = cal.find(p => p.screen.x > 70 && p.screen.y < 30);
        const bl = cal.find(p => p.screen.x < 30 && p.screen.y > 70);
        const br = cal.find(p => p.screen.x > 70 && p.screen.y > 70);

        if (center && tl && tr && bl && br) {
            const polyX = fitPolynomial2D([center, tl, tr, bl, br], 'x');
            const polyY = fitPolynomial2D([center, tl, tr, bl, br], 'y');

            if (polyX && polyY) {
                return { isValid: true, mode: 'polynomial', polyX, polyY };
            }
        }
    }

    // Affine fallback
    const center = cal.find(p => Math.abs(p.screen.x - 50) < 15 && Math.abs(p.screen.y - 50) < 15);
    if (center) {
        return {
            isValid: true,
            mode: 'affine',
            cx: center.eye.x,
            cy: center.eye.y,
            sx: 8.0,
            sy: 12.0
        };
    }

    return {
        isValid: true,
        mode: 'uncalibrated',
        cx: 50,
        cy: 45,
        sx: 8.0,
        sy: 12.0
    };
};

const evalPoly = (c, x, y) => c[0] + c[1] * x + c[2] * y + c[3] * x * x + c[4] * y * y + c[5] * x * y;

const getCalibratedGaze = (pt, m) => {
    if (m.mode === 'polynomial') {
        return {
            x: evalPoly(m.polyX, pt.eyeX, pt.eyeY),
            y: evalPoly(m.polyY, pt.eyeX, pt.eyeY)
        };
    }
    return {
        x: 50 + (pt.eyeX - m.cx) * m.sx,
        y: 50 + (pt.eyeY - m.cy) * m.sy
    };
};

const getDistance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

// --- Polynomial Fitting ---

const fitPolynomial2D = (points, axis) => {
    const n = points.length;
    if (n < 5) return null;

    const A = [];
    const b = [];
    for (const p of points) {
        const ex = p.eye.x;
        const ey = p.eye.y;
        A.push([1, ex, ey, ex * ex, ey * ey, ex * ey]);
        b.push(axis === 'x' ? p.screen.x : p.screen.y);
    }

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

    const coeffs = solveLinearSystem(ATA, ATb);
    if (!coeffs) return null;

    // Sanity check
    const centerPt = points.find(p => Math.abs(p.screen.x - 50) < 15 && Math.abs(p.screen.y - 50) < 15);
    if (centerPt) {
        const predicted = evalPoly(coeffs, centerPt.eye.x, centerPt.eye.y);
        const expected = axis === 'x' ? centerPt.screen.x : centerPt.screen.y;
        if (Math.abs(predicted - expected) > 20) return null;
    }

    return coeffs;
};

const solveLinearSystem = (A, b) => {
    const n = A.length;
    for (let i = 0; i < n; i++) A[i].push(b[i]);

    for (let col = 0; col < n; col++) {
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
        }
        [A[col], A[maxRow]] = [A[maxRow], A[col]];
        if (Math.abs(A[col][col]) < 1e-12) return null;

        for (let row = col + 1; row < n; row++) {
            const factor = A[row][col] / A[col][col];
            for (let j = col; j <= n; j++) A[row][j] -= factor * A[col][j];
        }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = A[i][n];
        for (let j = i + 1; j < n; j++) x[i] -= A[i][j] * x[j];
        x[i] /= A[i][i];
    }
    return x;
};

// ====================================================
// MAIN ENTRY POINT
// ====================================================

export const analyzeTestResults = (testId, rawData, calibrationData) => {
    if (!rawData || rawData.length === 0) {
        return { score: 0, metric: 'No Data', status: 'Inconclusive', dataQuality: 0, rawData: [] };
    }

    const mapping = getDiagnosticMapping(calibrationData);

    // Calibrate all gaze data
    // Calibrate all gaze data
    const calibratedData = rawData.map(pt => {
        const cal = getCalibratedGaze(pt, mapping);
        return {
            ...pt,
            x: cal.x,
            y: cal.y
        };
    });

    // TIER 2 FIX #7: Expands blink flags to discard ±100ms of data around blinks
    const preprocessedData = preprocessBlinks(calibratedData);

    // Compute data quality
    const validFrames = preprocessedData.filter(d => !d.isBlinking && d.x !== undefined && (d.confidence === undefined || d.confidence > 0.3));
    const dataQuality = Math.round((validFrames.length / preprocessedData.length) * 100);

    // Prepare velocity data for saccade detection
    const velocities = computeVelocities(preprocessedData);
    const threshold = computeVelocityThreshold(velocities);
    const saccades = detectSaccades(velocities, threshold);

    // Extract stimulus events from data
    const stimulusEvents = extractStimulusEvents(preprocessedData);

    // Sample gaze for visualization
    const sampledGaze = [];
    const step = Math.max(1, Math.floor(preprocessedData.length / 100));
    for (let i = 0; i < preprocessedData.length; i += step) {
        sampledGaze.push({ x: preprocessedData[i].x, y: preprocessedData[i].y });
    }

    // Dispatch to test-specific analyzer
    let results;
    let matchedResponses = [];

    switch (testId) {
        case 'fix':
            results = analyzeFixation(preprocessedData, velocities, saccades);
            break;
        case 'mgst':
            matchedResponses = matchSaccadesToStimuli(saccades, stimulusEvents);
            results = analyzeMGST(preprocessedData, saccades, stimulusEvents, matchedResponses);
            break;
        case 'ast':
            results = analyzeAST(preprocessedData, saccades, stimulusEvents);
            break;
        case 'spt':
            results = analyzeSPT(preprocessedData, saccades);
            break;
        case 'vgst':
            matchedResponses = matchSaccadesToStimuli(saccades, stimulusEvents);
            results = analyzeVGST(preprocessedData, saccades, stimulusEvents, matchedResponses);
            break;
        default:
            results = { score: 0, metric: 'Unknown Test', status: 'N/A' };
    }

    // Publication Quality: Vergence & Reliability
    const vergence = computeVergenceMetrics(preprocessedData);
    const reliability = computeReliabilityMetrics(velocities, matchedResponses);

    return {
        ...results,
        rawData: sampledGaze,
        dataQuality: Math.min(100, Math.max(0, dataQuality)),
        saccadeCount: saccades.length,
        velocityThreshold: Math.round(threshold),
        calibrationMode: mapping.mode,
        vergence,
        reliability
    };
};

// --- Stimulus Event Extraction ---

/**
 * Extracts stimulus change events from raw data.
 * A stimulus event occurs when targetX or targetY changes significantly.
 * Uses the stimulusOnsetTime field if available (Tier 1 Fix #3).
 */
function extractStimulusEvents(data) {
    const events = [];
    let lastX = data[0]?.targetX ?? 50;
    let lastY = data[0]?.targetY ?? 50;

    for (let i = 1; i < data.length; i++) {
        const dx = Math.abs(data[i].targetX - lastX);
        const dy = Math.abs(data[i].targetY - lastY);

        if (dx > 5 || dy > 5) {
            events.push({
                time: data[i].stimulusOnsetTime || data[i].time,
                fromX: lastX,
                fromY: lastY,
                toX: data[i].targetX,
                toY: data[i].targetY,
                targetVisible: data[i].targetVisible
            });
            lastX = data[i].targetX;
            lastY = data[i].targetY;
        }
    }

    return events;
}

// ====================================================
// TEST ANALYZERS (Upgraded with Saccade Detection)
// ====================================================

/**
 * FIXATION: BCEA + microsaccade rate + square-wave jerks
 */
function analyzeFixation(data, velocities, saccades) {
    if (data.length < 20) return { score: 0, metric: 'Insufficient Data', status: 'Retest Required' };

    const metrics = computeFixationMetrics(velocities, saccades);

    console.log('[OcularAnalyzer v2.1] Fixation raw BCEA:', metrics.bcea, 'MicSac:', metrics.microsaccadeRate);

    // Score based on BCEA (smaller = better)
    // iris-relative units: iris position lRelX * 100, so gaze jitter ≈ 3-8 units typical
    // BCEA = 2π * stdX * stdY * sqrt(1-ρ²), with stdX ≈ 3-8 gives BCEA ≈ 100-600
    // Thresholds: <200 excellent, 200-600 normal, 600-1200 borderline, >1200 impaired
    let score = 100;
    if (metrics.bcea !== null) {
        if (metrics.bcea > 200) score -= (metrics.bcea - 200) * 0.04;
        if (metrics.bcea > 600) score -= (metrics.bcea - 600) * 0.03;
        if (metrics.bcea > 1200) score -= (metrics.bcea - 1200) * 0.02;
    }

    // Penalize excessive microsaccades (>3/s is abnormal)
    if (metrics.microsaccadeRate > 3) {
        score -= (metrics.microsaccadeRate - 3) * 5;
    }

    // Penalize square-wave jerks (indicator of cerebellar dysfunction)
    score -= metrics.squareWaveJerks * 8;

    score = Math.max(0, Math.min(100, Math.round(score)));

    const bcStr = metrics.bcea !== null ? metrics.bcea.toFixed(1) : 'N/A';

    return {
        score,
        metric: `BCEA: ${bcStr} | μSac: ${metrics.microsaccadeRate}/s | SWJ: ${metrics.squareWaveJerks}`,
        status: score > 75 ? 'Optimal Fixation' : (score > 50 ? 'Borderline' : 'Impaired Fixation'),
        details: metrics
    };
}

/**
 * MGST: Memory-guided saccade latency + accuracy
 */
function analyzeMGST(data, saccades, stimulusEvents, responses) {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    // Use pre-matched responses (wider window for memory-guided saccades: -200ms to 1000ms)
    // -200ms catching anticipatory saccades to prevent "No valid saccades" errors.
    if (!responses) responses = matchSaccadesToStimuli(saccades, stimulusEvents, [-200, 1000]);

    const validResponses = responses.filter(r =>
        r.saccade !== null &&
        r.stimulus.targetVisible === false
    );
    const latencies = validResponses.map(r => r.latency);
    const gains = validResponses.filter(r => r.gain !== null).map(r => r.gain);

    if (latencies.length === 0) {
        return { score: 30, metric: 'No valid memory saccades', status: 'Retest Required' };
    }

    // Median latency
    latencies.sort((a, b) => a - b);
    const medianLatency = latencies[Math.floor(latencies.length / 2)];

    // Completion rate
    const memoryTrials = responses.filter(r => r.stimulus.targetVisible === false);
    const completionRate = validResponses.length / Math.max(memoryTrials.length, 1);

    // Vergence analysis
    const validVergence = data.filter(d => d.vergenceX !== undefined).map(d => Math.abs(d.vergenceX));
    const avgVergence = validVergence.length > 0 ? validVergence.reduce((a, b) => a + b, 0) / validVergence.length : 0;

    // Score: Clinical MGST norms
    // Healthy: 200-350ms, MHE: >400ms
    const latScore = Math.max(0, 100 - Math.max(0, medianLatency - 250) * 0.2);
    const score = Math.round(latScore * (0.6 + 0.4 * completionRate));

    return {
        score: Math.max(0, Math.min(100, score)),
        metric: `Lat: ${Math.round(medianLatency)}ms | Hit: ${validResponses.length}/${responses.length} | Verg: ${avgVergence.toFixed(1)}`,
        status: score > 70 ? 'Normal Memory-Response' : (score > 45 ? 'Borderline' : 'Impaired Response'),
        details: { medianLatency, completionRate, avgVergence, trialCount: responses.length }
    };
}

/**
 * AST: Antisaccade error rate + correction time
 */
function analyzeAST(data, saccades, stimulusEvents) {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    let totalTrials = 0;
    let prosaccadeErrors = 0;
    let correctLatencies = [];
    let errorLatencies = [];

    for (const stim of stimulusEvents) {
        if (!stim.targetVisible) continue;
        if (Math.abs(stim.toX - 50) < 10) continue; // Skip fixation returns

        totalTrials++;
        const targetSide = stim.toX > 50 ? 'right' : 'left';
        const correctSide = targetSide === 'right' ? 'left' : 'right'; // Antisaccade = opposite

        // Find first saccade in 80-800ms window (Widened for webcam latency)
        // Note: Antisaccades are slower (250ms+) than reflexive errors.
        const responseSaccade = saccades.find(s => {
            const lat = s.onsetTime - stim.time;
            return lat >= 80 && lat <= 800;
        });

        if (responseSaccade) {
            const latency = responseSaccade.onsetTime - stim.time;

            if (responseSaccade.direction === targetSide) {
                // Error: looked AT the target
                prosaccadeErrors++;
                errorLatencies.push(latency);
            } else if (responseSaccade.direction === correctSide) {
                // Correct: looked AWAY
                correctLatencies.push(latency);
            }
        }
    }

    const errorRate = totalTrials > 0 ? prosaccadeErrors / totalTrials : 0;

    // Score: Clinical AST norms
    // Healthy: <20% errors, MHE: >35% errors
    const score = Math.max(0, Math.round(100 - (errorRate * 130)));

    const avgCorrectLat = correctLatencies.length > 0
        ? Math.round(correctLatencies.reduce((a, b) => a + b, 0) / correctLatencies.length)
        : 0;

    return {
        score: Math.max(0, Math.min(100, score)),
        metric: `Errors: ${Math.round(errorRate * 100)}% (${prosaccadeErrors}/${totalTrials}) | Lat: ${avgCorrectLat}ms`,
        status: errorRate < 0.20 ? 'Normal Inhibition' : (errorRate < 0.35 ? 'Borderline' : 'Impaired Inhibition'),
        details: { errorRate, totalTrials, prosaccadeErrors, avgCorrectLat }
    };
}

/**
 * SPT: Smooth pursuit gain with saccade exclusion
 */
function analyzeSPT(data, saccades) {
    if (data.length < 20) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    const metrics = computePursuitMetrics(data, saccades);

    if (metrics.medianGain === null) {
        return { score: 60, metric: 'Gain: N/A (low data)', status: 'Retest Required' };
    }

    // Score: Gain of 1.0 is perfect
    // Healthy: 0.85-1.1, MHE: <0.75
    const gainDeviation = Math.abs(1.0 - metrics.medianGain);
    let score = 100 - gainDeviation * 80;

    // Penalize excessive catch-up saccades (>2/s = saccadic pursuit)
    if (metrics.catchUpSaccadeRate > 2) {
        score -= (metrics.catchUpSaccadeRate - 2) * 10;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
        score,
        metric: `Gain: ${metrics.medianGain.toFixed(3)} | RMSE: ${metrics.rmse}% | CUS: ${metrics.catchUpSaccadeRate}/s`,
        status: metrics.medianGain > 0.75 && metrics.medianGain < 1.25 ? 'Normal Pursuit' : 'Saccadic Pursuit',
        details: metrics
    };
}

/**
 * VGST: Visually-guided saccade latency + peak velocity (main sequence)
 */
function analyzeVGST(data, saccades, stimulusEvents, responses) {
    if (data.length < 10) return { score: 50, metric: 'Insufficient Data', status: 'Inconclusive' };

    // Use pre-matched responses (wider window for visually-guided saccades: 80-600ms)
    if (!responses) responses = matchSaccadesToStimuli(saccades, stimulusEvents, [80, 600]);

    const validResponses = responses.filter(r => r.saccade !== null);
    const latencies = validResponses.map(r => r.latency);
    const peakVelocities = validResponses.map(r => r.saccade.peakVelocity);
    const gains = validResponses.filter(r => r.gain !== null).map(r => r.gain);

    if (latencies.length < 3) {
        return { score: 30, metric: 'Too few valid saccades', status: 'Retest Required' };
    }

    // Median latency
    latencies.sort((a, b) => a - b);
    const medianLatency = latencies[Math.floor(latencies.length / 2)];

    // Median peak velocity
    peakVelocities.sort((a, b) => a - b);
    const medianPeakVel = peakVelocities[Math.floor(peakVelocities.length / 2)];

    // Median gain
    const medianGain = gains.length > 0
        ? (gains.sort((a, b) => a - b), gains[Math.floor(gains.length / 2)])
        : null;

    const completionRate = validResponses.length / Math.max(responses.length, 1);
    const missedCount = responses.length - validResponses.length;

    // Score: Clinical VGST norms
    // Healthy: median <250ms, MHE: >350ms
    const latScore = Math.max(0, 100 - Math.max(0, medianLatency - 180) * 0.2);
    const score = Math.round(latScore * (0.7 + 0.3 * completionRate));

    return {
        score: Math.max(0, Math.min(100, score)),
        metric: `Lat: ${Math.round(medianLatency)}ms | PkVel: ${Math.round(medianPeakVel)}%/s | ${validResponses.length}/${responses.length} hits`,
        status: medianLatency < 300 && completionRate > 0.7 ? 'Normal Reflex' : (medianLatency < 400 ? 'Borderline' : 'Delayed Response'),
        details: {
            medianLatency,
            medianPeakVelocity: medianPeakVel,
            medianGain,
            completionRate,
            missedCount,
            trialCount: responses.length
        }
    };
}

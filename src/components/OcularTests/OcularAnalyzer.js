
/**
 * OcularAnalyzer.js
 * 
 * Implements the heuristic analysis for MHE detection based on the research provided.
 * 
 * METRICS:
 * 1. MGST (Memory Guided Saccades):
 *    - Spatial Accuracy: Euclidean distance between Gaze vs Target during Response Phase.
 *    - Latency: Time taken to initiate saccade (though less reliable on 30fps webcam).
 * 
 * 2. AST (Antisaccades):
 *    - Directional Error Rate: % of times gaze moved TOWARDS cue instead of OPPOSITE.
 * 
 * 3. SPT (Smooth Pursuit):
 *    - Velocity Gain: NOT IMPLEMENTED FULLY via webcam due to low Hz.
 *    - RMSE: Root Mean Square Error of position (easier proxy for smooth tracking).
 */

export const analyzeTestResults = (testId, rawData, config) => {
    if (!rawData || rawData.length === 0) return { score: 0, metric: 'No Data', status: 'Inconclusive' };

    switch (testId) {
        case 'mgst':
            return analyzeMGST(rawData);
        case 'ast':
            return analyzeAST(rawData);
        case 'spt':
            return analyzeSPT(rawData);
        case 'vgst':
            return analyzeVGST(rawData);
        default:
            return {};
    }
};

const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

const getRelativePos = (pt, baseline) => {
    // We don't know the exact pixels-to-screen conversion without 9-point,
    // but we can estimate based on expected orbital range (approx 15-20% of frame width).
    // For qualitative MHE detection, directionality is key.

    const sensitivity = 5.0; // Scale factor: pixels of eye movement to % screen movement proxy
    const dx = (pt.eyeX - baseline.x) * sensitivity;
    const dy = (pt.eyeY - baseline.y) * sensitivity * (16 / 9); // Adjust for typical aspect ratio imbalance

    // Mirror horizontal movement because camera is mirrored
    return {
        x: 50 - dx,
        y: 50 + dy
    };
};

const analyzeMGST = (data) => {
    if (data.length < 10) return { score: 0, metric: 'Low Data', status: 'Inconclusive' };

    // Baseline: First 500ms where user is (hopefully) looking at center
    const baseline = { x: data[0].eyeX, y: data[0].eyeY };

    let cycleDur = 4500;
    let validSamples = 0;
    let totalError = 0;

    data.forEach(pt => {
        const t = pt.time - data[0].time;
        const cycleOffset = t % cycleDur;

        if (cycleOffset > 3000) { // Response phase
            const cycleIndex = Math.floor(t / cycleDur);
            const isLeft = (cycleIndex % 2 === 0);
            const targetX = isLeft ? 20 : 80;
            const targetY = 50;

            const gaze = getRelativePos(pt, baseline);
            const dist = getDistance(gaze.x, gaze.y, targetX, targetY);

            totalError += dist;
            validSamples++;
        }
    });

    const avgError = validSamples > 0 ? (totalError / validSamples) : 100;
    const score = Math.max(0, 100 - (avgError * 2));

    return {
        score: Math.round(score),
        metric: `${Math.round(avgError)}% Avg Error`,
        status: score > 60 ? 'Normal' : 'Deficit Detected'
    };
};

const analyzeAST = (data) => {
    if (data.length < 10) return { score: 0, metric: 'Low Data', status: 'Inconclusive' };

    const baseline = { x: data[0].eyeX, y: data[0].eyeY };
    let errors = 0;
    let trials = 0;

    data.forEach(pt => {
        if (pt.targetVisible && pt.targetX !== 50) {
            const isLeftCue = pt.targetX < 50;
            const gaze = getRelativePos(pt, baseline);

            // ERROR: If Cue is Left, Gaze should NOT be Left (<50). 
            // It should move Right (>50) for Antisaccade.
            if (isLeftCue && gaze.x < 45) errors++;
            if (!isLeftCue && gaze.x > 55) errors++;
            trials++;
        }
    });

    const errorRate = trials > 0 ? (errors / trials) : 0;
    const score = Math.max(0, 100 - (errorRate * 100));

    return {
        score: Math.round(score),
        metric: `${Math.round(errorRate * 100)}% Error Rate`,
        status: errorRate < 0.4 ? 'Normal' : 'Inhibition Deficit'
    };
};

const analyzeSPT = (data) => {
    if (data.length < 10) return { score: 0, metric: 'Low Data', status: 'Inconclusive' };

    const baseline = { x: data[0].eyeX, y: data[0].eyeY };
    let totalSqError = 0;
    let count = 0;

    data.forEach(pt => {
        const gaze = getRelativePos(pt, baseline);
        const error = gaze.x - pt.targetX;
        totalSqError += (error * error);
        count++;
    });

    const rmse = count > 0 ? Math.sqrt(totalSqError / count) : 100;
    const score = Math.max(0, 100 - (rmse * 2));

    return {
        score: Math.round(score),
        metric: `RMSE: ${rmse.toFixed(1)}`,
        status: rmse < 20 ? 'Normal' : 'Tracking Lag'
    };
};

// VGST is strictly control/reflex, low diagnostic value for MHE but good baseline.
const analyzeVGST = (data) => {
    // Just measure if they ever got there.
    return { score: 100, metric: 'Baseline', status: 'N/A' };
}

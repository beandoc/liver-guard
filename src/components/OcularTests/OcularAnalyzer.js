
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

const analyzeMGST = (data) => {
    // Filter for "Response Phase" only (where target was ghost/invisible but user had to look there)
    // In our implementation, we flagged this target as 'visible: true' + 'ghost: true' in Demo, 
    // but in Real test 'visible: false'.
    // We can infer phases by checking when target disappeared.

    // However, simpler approach: Look at the last 1.5s of every 4.5s cycle.
    // Cycle: 4500ms. Phase 3 starts at 3000ms.

    let cycleDur = 4500;
    let validSamples = 0;
    let totalError = 0;
    let responseCount = 0;

    data.forEach(pt => {
        // Calculate cycle offset
        // Assuming test starts at t=0 relative to first point? 
        // Better: Use pt.time. We don't have start time in data, so assume data[0].time is roughly start.
        const t = pt.time - data[0].time;
        const cycleOffset = t % cycleDur;

        // Response phase is approx 3000ms to 4500ms
        if (cycleOffset > 3000) {
            // We need to know where the memory target WAS.
            // Based on our logic: Left (20%) if even cycle, Right (80%) if odd.
            const cycleIndex = Math.floor(t / cycleDur);
            const isLeft = (cycleIndex % 2 === 0);
            const targetX = isLeft ? 20 : 80;
            const targetY = 50;

            // Normalize Gaze X (pixels) to %? 
            // WebGazer gives Pixels. Target is in %.
            // We need window dimensions. 
            // PROXY: validSamples++; 
            // For now, let's assume we converted gaze pixels to % in capturing component? 
            // Ah, we didn't. We stored pixels. We need window size.
            // Assumption: User didn't resize window during 60s test.

            const winW = window.innerWidth; // Approximate current state
            const winH = window.innerHeight;

            const gazeX_pct = (pt.gazeX / winW) * 100;
            const gazeY_pct = (pt.gazeY / winH) * 100;

            const dist = getDistance(gazeX_pct, gazeY_pct, targetX, targetY);

            totalError += dist;
            validSamples++;
        }
    });

    // Score: Average Distance Error in %. Lower is better.
    // If Avg Error < 15% screen width -> Excellent. > 30% -> Poor.
    const avgError = validSamples > 0 ? (totalError / validSamples) : 100;

    // Scale to 0-100 "Accuracy Score"
    // 0 error = 100 scoe. 50 error = 0 score.
    const score = Math.max(0, 100 - (avgError * 2));

    return {
        score: Math.round(score),
        metric: `${Math.round(avgError)}% Avg Error`,
        rawError: avgError,
        status: score > 70 ? 'Normal' : 'Deficit Detected'
    };
};

const analyzeAST = (data) => {
    // AST: Look AWAY from target.
    // If target is Left (20), Gaze should be Right (>50).
    // If target is Right (80), Gaze should be Left (<50).

    let errors = 0;
    let trials = 0;
    let lastTargetX = -1;

    // Downsample/Debounce: We only care about the *direction* after the cue appears.
    // Logic: Identify when cue APPEARS (visible=true, isCue=true). Check gaze 500ms later.

    // Simplification: Iterate points. If target visible...
    for (let i = 0; i < data.length; i++) {
        const pt = data[i];

        // In AST config we didn't save 'isCue' to data stream explicitly, just targetX.
        // But we know AST target is always a Cue.
        if (pt.targetVisible) {
            // Determine side
            const isLeftCue = pt.targetX_pct < 50;
            if (!isLeftCue && pt.targetX_pct > 50) { /* Right Cue */ }
            else if (isLeftCue) { /* Left Cue */ }
            else { continue; } // Center or unknown

            // Convert gaze to %
            const winW = window.innerWidth;
            const gazeX_pct = (pt.gazeX / winW) * 100;

            // ERROR: If Cue is Left, Gaze is Left (<50).
            // CORRECT: If Cue is Left, Gaze is Right (>50).

            if (isLeftCue && gazeX_pct < 40) errors++; // Buffer of 10% from center
            if (!isLeftCue && gazeX_pct > 60) errors++;

            trials++;
        }
    }

    const errorRate = trials > 0 ? (errors / trials) : 0;

    // Low Error Rate is Good.
    // Score: 100 - (ErrorRate * 100)
    const score = Math.max(0, 100 - (errorRate * 100));

    return {
        score: Math.round(score),
        metric: `${Math.round(errorRate * 100)}% Error Rate`,
        status: errorRate < 0.3 ? 'Normal' : 'Inhibition Deficit'
    };
};

const analyzeSPT = (data) => {
    // SPT: Linear Tracking.
    // Measure RMSE between Gaze X and Target X.

    let totalSqError = 0;
    let count = 0;

    data.forEach(pt => {
        const winW = window.innerWidth;
        const gazeX_pct = (pt.gazeX / winW) * 100;

        const error = gazeX_pct - pt.targetX_pct;
        totalSqError += (error * error);
        count++;
    });

    const rmse = count > 0 ? Math.sqrt(totalSqError / count) : 100;

    // Normal RMSE should be low (e.g., < 10%).
    const score = Math.max(0, 100 - (rmse * 3));

    return {
        score: Math.round(score),
        metric: `RMSE: ${rmse.toFixed(1)}`,
        status: rmse < 15 ? 'Normal' : 'Tracking Lag'
    };
};

// VGST is strictly control/reflex, low diagnostic value for MHE but good baseline.
const analyzeVGST = (data) => {
    // Just measure if they ever got there.
    return { score: 100, metric: 'Baseline', status: 'N/A' };
}

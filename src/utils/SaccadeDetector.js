/**
 * SaccadeDetector.js
 * 
 * Clinical-grade velocity-based saccade detection algorithm.
 * 
 * Implements the Engbert & Kliegl (2003) velocity threshold method
 * adapted for webcam-based eye tracking (~30-60 Hz).
 * 
 * Saccade definition:
 *   - Onset: velocity exceeds λ × median velocity (λ = 6 for webcams)
 *   - Offset: velocity drops below threshold
 *   - Minimum duration: 12ms (physiological minimum)
 *   - Minimum amplitude: 1° visual angle (~2% screen width)
 * 
 * Extracts per-saccade:
 *   - latency (stimulus onset → saccade onset)
 *   - peakVelocity (°/s equivalent in screen %/s)
 *   - amplitude (screen %)
 *   - duration (ms)
 *   - direction (left/right/up/down)
 *   - gain (amplitude / target eccentricity)
 */

// --- Constants ---
const VELOCITY_LAMBDA = 4.5;        // Threshold multiplier (Relaxed for webcam noise)
const MIN_SACCADE_DURATION_MS = 12; // Physiological minimum
const MIN_SACCADE_AMPLITUDE = 1.0;  // % screen width
const MIN_INTERSACCADE_MS = 50;     // Minimum gap between saccades
const BLINK_VELOCITY_CEIL = 500;    // Absurd velocity = blink artifact (%/s)
const BLINK_BUFFER_MS = 100;        // Clinical standard: discard ±100ms around blinks

/**
 * Expands blink flags to include a buffer before and after.
 * Prevents blink-start and blink-end artifacts from being detected as saccades.
 * 
 * @param {Array} data - raw data
 * @returns {Array} data with expanded isBlinking flags
 */
export function preprocessBlinks(data) {
    const result = data.map(d => ({ ...d }));
    const blinkIndices = [];

    for (let i = 0; i < data.length; i++) {
        if (data[i].isBlinking) blinkIndices.push(i);
    }

    if (blinkIndices.length === 0) return result;

    for (let i = 0; i < result.length; i++) {
        const time = result[i].time;
        // Check if this time is within 100ms of ANY recorded blink
        const nearBlink = blinkIndices.some(idx => {
            return Math.abs(data[idx].time - time) <= BLINK_BUFFER_MS;
        });
        if (nearBlink) result[i].isBlinking = true;
    }

    return result;
}

/**
 * Computes per-sample velocity from a gaze data array.
 * Uses central difference for interior points, forward/backward for edges.
 * 
 * TIER 2 FIX #8: Head movement compensation.
 * velocity_true = (eye_pos_2 - eye_pos_1) - (head_pos_2 - head_pos_1)
 */
export function computeVelocities(data) {
    if (data.length < 3) return [];

    const result = [];

    for (let i = 0; i < data.length; i++) {
        let vx, vy;
        let vhx = 0, vhy = 0; // head velocity

        const getHeadDelta = (idx1, idx2, dt) => {
            if (data[idx1].headX === undefined) return { x: 0, y: 0 };
            return {
                x: (data[idx2].headX - data[idx1].headX) / dt,
                y: (data[idx2].headY - data[idx1].headY) / dt
            };
        };

        if (i === 0) {
            const dt = (data[1].time - data[0].time) / 1000;
            if (dt <= 0) continue;
            vx = (data[1].x - data[0].x) / dt;
            vy = (data[1].y - data[0].y) / dt;
            const h = getHeadDelta(0, 1, dt);
            vhx = h.x; vhy = h.y;
        } else if (i === data.length - 1) {
            const dt = (data[i].time - data[i - 1].time) / 1000;
            if (dt <= 0) continue;
            vx = (data[i].x - data[i - 1].x) / dt;
            vy = (data[i].y - data[i - 1].y) / dt;
            const h = getHeadDelta(i - 1, i, dt);
            vhx = h.x; vhy = h.y;
        } else {
            const dt = (data[i + 1].time - data[i - 1].time) / 1000;
            if (dt <= 0) continue;
            vx = (data[i + 1].x - data[i - 1].x) / dt;
            vy = (data[i + 1].y - data[i - 1].y) / dt;
            const h = getHeadDelta(i - 1, i + 1, dt);
            vhx = h.x; vhy = h.y;
        }

        // Subtract head velocity from apparent eye velocity
        // head pos is 0-1, eye pos is 0-100? No, check IrisTracker.
        // headX is landmarks[idx].x (0-1), eyeX is ratio 0-1 (e.g. 0.5)
        // Wait, IrisTracker returns smoothLeft.x which is lRelX * 100.
        // So gaze pos is 0-100. Head pos is 0-1. 
        // We need to scale head delta by 100 to match eye delta.
        vx = vx - (vhx * 100);
        vy = vy - (vhy * 100);

        const speed = Math.sqrt(vx * vx + vy * vy); // %/s

        result.push({
            time: data[i].time,
            x: data[i].x,
            y: data[i].y,
            vx,
            vy,
            speed,
            confidence: data[i].confidence,
            isBlinking: data[i].isBlinking
        });
    }

    return result;
}

/**
 * Computes adaptive velocity threshold using median absolute deviation.
 * More robust than mean-based thresholds.
 * 
 * @param {Array} velocities - output from computeVelocities
 * @returns {number} threshold in %/s
 */
export function computeVelocityThreshold(velocities) {
    // Filter out blink artifacts and zero-confidence frames
    const valid = velocities.filter(v =>
        !v.isBlinking &&
        v.speed < BLINK_VELOCITY_CEIL &&
        (v.confidence === undefined || v.confidence > 0.3)
    );

    if (valid.length < 10) return 30; // Fallback

    const speeds = valid.map(v => v.speed).sort((a, b) => a - b);
    const median = speeds[Math.floor(speeds.length / 2)];

    // MAD = Median Absolute Deviation
    const deviations = speeds.map(s => Math.abs(s - median)).sort((a, b) => a - b);
    const mad = deviations[Math.floor(deviations.length / 2)];

    // Threshold = lambda * sqrt(median^2 + mad^2)
    // This is the Engbert-Kliegl adaptive threshold
    const threshold = VELOCITY_LAMBDA * Math.sqrt(median * median + mad * mad);

    // Clamp to reasonable range for webcam tracking
    // Max 150 ensures we don't miss slower saccades when noise is high
    return Math.max(15, Math.min(threshold, 150));
}

/**
 * Detects saccades from velocity-enriched gaze data.
 * 
 * @param {Array} velocities - output from computeVelocities
 * @param {number} threshold - velocity threshold in %/s
 * @returns {Array} detected saccades [{onsetTime, offsetTime, onsetIdx, offsetIdx, 
 *                   peakVelocity, amplitude, duration, direction, startPos, endPos}]
 */
export function detectSaccades(velocities, threshold) {
    const saccades = [];
    let inSaccade = false;
    let saccadeStart = null;
    let peakVel = 0;
    let lastSaccadeEnd = -Infinity;

    for (let i = 0; i < velocities.length; i++) {
        const v = velocities[i];

        // Skip blink artifacts
        if (v.isBlinking || v.speed > BLINK_VELOCITY_CEIL) {
            if (inSaccade) {
                inSaccade = false;
                saccadeStart = null;
            }
            continue;
        }

        if (!inSaccade && v.speed > threshold) {
            // Check minimum inter-saccade interval
            if (v.time - lastSaccadeEnd < MIN_INTERSACCADE_MS) continue;

            inSaccade = true;
            saccadeStart = { idx: i, time: v.time, x: v.x, y: v.y };
            peakVel = v.speed;
        }
        else if (inSaccade && v.speed > threshold) {
            peakVel = Math.max(peakVel, v.speed);
        }
        else if (inSaccade && v.speed <= threshold) {
            // End of saccade
            const duration = v.time - saccadeStart.time;
            const amplitude = Math.sqrt(
                Math.pow(v.x - saccadeStart.x, 2) +
                Math.pow(v.y - saccadeStart.y, 2)
            );

            if (duration >= MIN_SACCADE_DURATION_MS && amplitude >= MIN_SACCADE_AMPLITUDE) {
                const dx = v.x - saccadeStart.x;
                const dy = v.y - saccadeStart.y;
                let direction;
                if (Math.abs(dx) > Math.abs(dy)) {
                    direction = dx > 0 ? 'right' : 'left';
                } else {
                    direction = dy > 0 ? 'down' : 'up';
                }

                saccades.push({
                    onsetTime: saccadeStart.time,
                    offsetTime: v.time,
                    onsetIdx: saccadeStart.idx,
                    offsetIdx: i,
                    peakVelocity: peakVel,
                    amplitude: amplitude,
                    duration: duration,
                    direction: direction,
                    startPos: { x: saccadeStart.x, y: saccadeStart.y },
                    endPos: { x: v.x, y: v.y }
                });

                lastSaccadeEnd = v.time;
            }

            inSaccade = false;
            saccadeStart = null;
        }
    }

    return saccades;
}

/**
 * Matches detected saccades to stimulus events (target jumps).
 * For each stimulus event, finds the first saccade within [80ms, 800ms] 
 * and computes latency and gain.
 * 
 * @param {Array} saccades - output from detectSaccades
 * @param {Array} stimulusEvents - [{time, fromX, fromY, toX, toY}, ...]
 * @returns {Array} matched responses [{stimulus, saccade, latency, gain, isCorrectDirection}]
 */
export function matchSaccadesToStimuli(saccades, stimulusEvents, latencyWindowMs = [80, 800]) {
    const responses = [];
    const [minLatency, maxLatency] = latencyWindowMs;

    for (const stim of stimulusEvents) {
        const targetAmplitude = Math.sqrt(
            Math.pow(stim.toX - stim.fromX, 2) +
            Math.pow(stim.toY - stim.fromY, 2)
        );
        const targetDirection = (stim.toX - stim.fromX) > 0 ? 'right' : 'left';

        // Find first valid saccade after stimulus within clinical window
        let matched = null;
        for (const sac of saccades) {
            const latency = sac.onsetTime - stim.time;
            if (latency >= minLatency && latency <= maxLatency) {
                matched = sac;
                break;
            }
            if (latency > maxLatency) break;
        }

        if (matched) {
            const latency = matched.onsetTime - stim.time;
            const gain = targetAmplitude > 0 ? matched.amplitude / targetAmplitude : 0;
            const isCorrectDirection = matched.direction === targetDirection;

            responses.push({
                stimulus: stim,
                saccade: matched,
                latency,
                gain,
                isCorrectDirection
            });
        } else {
            responses.push({
                stimulus: stim,
                saccade: null,
                latency: null,
                gain: null,
                isCorrectDirection: null
            });
        }
    }

    return responses;
}

/**
 * Computes fixation stability metrics (BCEA, microsaccade rate).
 * 
 * BCEA = Bivariate Contour Ellipse Area — the standard clinical fixation metric.
 * Measured in screen % (approximation of visual degrees for webcam).
 * 
 * @param {Array} velocities - from computeVelocities, during fixation period
 * @param {Array} saccades - detected saccades during fixation
 * @returns {Object} {bcea, microsaccadeRate, driftVelocity, squareWaveJerks}
 */
export function computeFixationMetrics(velocities, saccades) {
    // Filter to fixation-only samples (between saccades)
    const fixationSamples = velocities.filter(v =>
        !v.isBlinking &&
        (v.confidence === undefined || v.confidence > 0.3) &&
        v.speed < 30 // Below saccade threshold = fixation
    );

    if (fixationSamples.length < 20) {
        return { bcea: null, microsaccadeRate: 0, driftVelocity: 0, squareWaveJerks: 0 };
    }

    // BCEA calculation
    // Coordinates are iris-relative, scaled 0–100 by Kalman filter.
    // Compute BCEA directly in these units — no re-normalization needed.
    const xs = fixationSamples.map(s => s.x);
    const ys = fixationSamples.map(s => s.y);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

    const varX = xs.reduce((s, x) => s + (x - meanX) ** 2, 0) / xs.length;
    const varY = ys.reduce((s, y) => s + (y - meanY) ** 2, 0) / ys.length;
    const covXY = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0) / xs.length;

    const stdX = Math.sqrt(varX);
    const stdY = Math.sqrt(varY);
    const rho = stdX > 0 && stdY > 0 ? covXY / (stdX * stdY) : 0;
    const rhoClamped = Math.max(-0.99, Math.min(0.99, rho));

    // BCEA = 2π * σx * σy * sqrt(1 - ρ²)
    // In iris-relative units (0-100 range, typical gaze jitter ≈ 1-5 units)
    // Healthy BCEA: <5 (good) → 10 (normal) → >15 (impaired)
    const bcea = 2 * Math.PI * stdX * stdY * Math.sqrt(1 - rhoClamped * rhoClamped);

    // Microsaccade rate (saccades < 2° amplitude during fixation)
    const microsaccades = saccades.filter(s => s.amplitude < 2.0);
    const totalDuration = (fixationSamples[fixationSamples.length - 1].time - fixationSamples[0].time) / 1000;
    const microsaccadeRate = totalDuration > 0 ? microsaccades.length / totalDuration : 0;

    // Drift velocity (slow eye movements during fixation)
    const driftVelocities = fixationSamples.map(s => s.speed);
    const driftVelocity = driftVelocities.reduce((a, b) => a + b, 0) / driftVelocities.length;

    // Square-wave jerks: paired saccades in opposite directions within 200ms
    let squareWaveJerks = 0;
    for (let i = 0; i < microsaccades.length - 1; i++) {
        const interval = microsaccades[i + 1].onsetTime - microsaccades[i].offsetTime;
        const oppositeDir = microsaccades[i].direction !== microsaccades[i + 1].direction;
        if (interval < 200 && interval > 0 && oppositeDir) {
            squareWaveJerks++;
        }
    }

    return {
        bcea: Math.round(bcea * 100) / 100,
        microsaccadeRate: Math.round(microsaccadeRate * 100) / 100,
        driftVelocity: Math.round(driftVelocity * 100) / 100,
        squareWaveJerks
    };
}

/**
 * Computes smooth pursuit gain using velocity matching.
 * 
 * Gain = median(eye_velocity / target_velocity) during pursuit phases.
 * Excludes catch-up saccades and turnaround points.
 * 
 * @param {Array} data - raw gaze data with targetX, targetY, time
 * @param {Array} saccades - detected saccades (to exclude)
 * @returns {Object} {medianGain, rmse, catchUpSaccadeRate}
 */
export function computePursuitMetrics(data, saccades) {
    if (data.length < 20) return { medianGain: null, rmse: null, catchUpSaccadeRate: 0 };

    // Build set of saccade intervals for exclusion
    const saccadeIntervals = saccades.map(s => [s.onsetTime, s.offsetTime]);

    const isInSaccade = (t) => saccadeIntervals.some(([on, off]) => t >= on && t <= off);

    const gains = [];
    const positionErrors = [];
    const MIN_DT = 0.010; // 10ms minimum

    // TIER 2 FIX: Auto-scale eye data to target range for webcam gain normalization
    // Iris-relative coords range ~30 units, Target range 80 units.
    // We compute scale factor from the data itself.
    let minEye = Infinity, maxEye = -Infinity;
    let minTgt = Infinity, maxTgt = -Infinity;
    for (const d of data) {
        if (d.x < minEye) minEye = d.x;
        if (d.x > maxEye) maxEye = d.x;
        if (d.targetX < minTgt) minTgt = d.targetX;
        if (d.targetX > maxTgt) maxTgt = d.targetX;
    }
    const safeEyeRange = Math.max(maxEye - minEye, 1);
    const safeTgtRange = Math.max(maxTgt - minTgt, 1);
    const scaleFactor = safeTgtRange / safeEyeRange;

    for (let i = 1; i < data.length; i++) {
        if (isInSaccade(data[i].time)) continue;
        if (data[i].isBlinking) continue;
        if (data[i].confidence !== undefined && data[i].confidence < 0.3) continue;

        const dt = (data[i].time - data[i - 1].time) / 1000;
        if (dt < MIN_DT) continue;

        const targetVel = (data[i].targetX - data[i - 1].targetX) / dt;

        // Skip near-zero target velocity (turnaround points)
        if (Math.abs(targetVel) < 5) continue;

        // Use .x and .y for consistency with velocity engine
        const eyeVel = ((data[i].x - data[i - 1].x) / dt) * scaleFactor;
        const gain = eyeVel / targetVel;

        // Allow slightly wider gain range for noisy webcam data
        if (gain >= 0 && gain <= 4.0) {
            gains.push(gain);
        }

        // Position error
        const error = Math.abs(data[i].x - data[i].targetX);
        positionErrors.push(error);
    }

    if (gains.length < 5) return { medianGain: null, rmse: null, catchUpSaccadeRate: 0 };

    gains.sort((a, b) => a - b);
    const medianGain = gains[Math.floor(gains.length / 2)];

    const rmse = Math.sqrt(positionErrors.reduce((s, e) => s + e * e, 0) / positionErrors.length);

    // Catch-up saccade rate: saccades per second of pursuit
    const totalTime = (data[data.length - 1].time - data[0].time) / 1000;
    const catchUpSaccadeRate = totalTime > 0 ? saccades.length / totalTime : 0;

    return {
        medianGain: Math.round(medianGain * 1000) / 1000,
        rmse: Math.round(rmse * 100) / 100,
        catchUpSaccadeRate: Math.round(catchUpSaccadeRate * 100) / 100
    };
}

/**
 * Computes vergence analysis (binocular coordination).
 * Convergence Insufficiency (CI) is a key clinical marker.
 * 
 * @param {Array} data - raw data with vergenceX/vergenceY
 * @returns {Object} {medianVergence, vergenceInstability, ciScore}
 */
export function computeVergenceMetrics(data) {
    const valid = data.filter(d => !d.isBlinking && d.vergenceX !== undefined);
    if (valid.length < 20) return { medianVergence: 0, vergenceInstability: 0, ciScore: 0 };

    const vxs = valid.map(d => Math.abs(d.vergenceX));
    vxs.sort((a, b) => a - b);
    const medianVergence = vxs[Math.floor(vxs.length / 2)];

    // Instability = variance in vergence during fixation/pursuit
    const mean = vxs.reduce((a, b) => a + b, 0) / vxs.length;
    const variance = vxs.reduce((s, v) => s + (v - mean) ** 2, 0) / vxs.length;
    const instability = Math.sqrt(variance);

    // CI Score: normalized 0-100 where >70 is significant insufficiency
    // Based on instability and low overall vergence gain
    let ciScore = (instability * 10);
    if (medianVergence < 2) ciScore += 20; // Structural weakness

    return {
        medianVergence: Math.round(medianVergence * 100) / 100,
        vergenceInstability: Math.round(instability * 100) / 100,
        ciScore: Math.round(Math.min(100, ciScore))
    };
}

/**
 * Computes reliability metrics (proxy for test-retest).
 * Measures data quality, internal consistency, and noise level.
 * 
 * @param {Array} velocities - from computeVelocities
 * @param {Array} matchedResponses - stimulus matched saccades
 * @returns {Object} {reliabilityScore, snr, coefficientOfVariation}
 */
export function computeReliabilityMetrics(velocities, matchedResponses) {
    // 1. Signal-to-Noise Ratio (SNR)
    // Signal = median peak velocity, Noise = median drift velocity
    const fixationVelocities = velocities.filter(v => v.speed < 20).map(v => v.speed);
    const saccadeVelocities = velocities.filter(v => v.speed > 50).map(v => v.speed);

    let snr = 0;
    if (fixationVelocities.length > 0 && saccadeVelocities.length > 0) {
        const noise = fixationVelocities.reduce((a, b) => a + b, 0) / fixationVelocities.length;
        const signal = saccadeVelocities.reduce((a, b) => a + b, 0) / saccadeVelocities.length;
        snr = signal / (noise || 1);
    }

    // 2. Coefficient of Variation (CV) in saccade latencies
    // Low CV (<0.2) = high internal consistency/reliability
    const latencies = matchedResponses.filter(r => r.latency !== null).map(r => r.latency);
    let cv = 1.0;
    if (latencies.length > 2) {
        const meanLat = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const sdLat = Math.sqrt(latencies.reduce((s, l) => s + (l - meanLat) ** 2, 0) / latencies.length);
        cv = sdLat / meanLat;
    }

    // 3. Overall Reliability Score (0-100)
    let reliabilityScore = 100;
    if (snr < 10) reliabilityScore -= (10 - snr) * 5;
    if (cv > 0.3) reliabilityScore -= (cv - 0.3) * 100;
    if (latencies.length < 3) reliabilityScore -= 40;

    return {
        reliabilityScore: Math.round(Math.max(0, reliabilityScore)),
        snr: Math.round(snr * 10) / 10,
        cv: Math.round(cv * 100) / 100
    };
}

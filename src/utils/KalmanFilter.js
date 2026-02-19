/**
 * KalmanFilter.js
 * 
 * A simple 2D Kalman Filter (Position + Velocity) to smooth gaze tracking data.
 * Helps eliminate jitter and handles short occlusion (blinks).
 */

export class KalmanFilter2D {
    constructor(processNoise = 0.03, measurementNoise = 0.8) {
        // State: [x, y, dx, dy]
        this.x = [0, 0, 0, 0];

        // Covariance matrix
        this.P = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];

        // Process noise
        this.Q = [
            [processNoise, 0, 0, 0],
            [0, processNoise, 0, 0],
            [0, 0, processNoise, 0],
            [0, 0, 0, processNoise]
        ];

        // Measurement noise
        this.R = [
            [measurementNoise, 0],
            [0, measurementNoise]
        ];

        this.isInitialized = false;
    }

    predict(dt = 1) {
        // F = [[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]]
        // x = F * x
        this.x[0] = this.x[0] + dt * this.x[2];
        this.x[1] = this.x[1] + dt * this.x[3];

        // P = F * P * F' + Q
        // (Simplified update for speed)
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                this.P[i][j] += this.Q[i][j];
            }
        }
    }

    update(z) {
        if (!this.isInitialized) {
            this.x = [z[0], z[1], 0, 0];
            this.isInitialized = true;
            return;
        }

        // Observation matrix H = [[1, 0, 0, 0], [0, 1, 0, 0]]
        // Innovation y = z - H * x
        const y = [z[0] - this.x[0], z[1] - this.x[1]];

        // S = H * P * H' + R
        const S = [
            [this.P[0][0] + this.R[0][0], this.P[0][1]],
            [this.P[1][0], this.P[1][1] + this.R[1][1]]
        ];

        // Kalman Gain K = P * H' * S^-1
        const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
        const Si = [
            [S[1][1] / det, -S[0][1] / det],
            [-S[1][0] / det, S[0][0] / det]
        ];

        const K = [
            [this.P[0][0] * Si[0][0] + this.P[0][1] * Si[1][0], this.P[0][0] * Si[0][1] + this.P[0][1] * Si[1][1]],
            [this.P[1][0] * Si[0][0] + this.P[1][1] * Si[1][0], this.P[1][0] * Si[0][1] + this.P[1][1] * Si[1][1]],
            [this.P[2][0] * Si[0][0] + this.P[2][1] * Si[1][0], this.P[2][0] * Si[0][1] + this.P[2][1] * Si[1][1]],
            [this.P[3][0] * Si[0][0] + this.P[3][1] * Si[1][0], this.P[3][0] * Si[0][1] + this.P[3][1] * Si[1][1]]
        ];

        // x = x + K * y
        this.x[0] += K[0][0] * y[0] + K[0][1] * y[1];
        this.x[1] += K[1][0] * y[0] + K[1][1] * y[1];
        this.x[2] += K[2][0] * y[0] + K[2][1] * y[1];
        this.x[3] += K[3][0] * y[0] + K[3][1] * y[1];

        // P = (I - K * H) * P
        // (Simplified for performance)
        const I_KH = [
            [1 - K[0][0], -K[0][1], 0, 0],
            [-K[1][0], 1 - K[1][1], 0, 0],
            [-K[2][0], -K[2][1], 1, 0],
            [-K[3][0], -K[3][1], 0, 1]
        ];

        // New P update logic (approximate for stability)
        this.P[0][0] *= (1 - K[0][0]);
        this.P[1][1] *= (1 - K[1][1]);
    }

    setNoise(processNoise, measurementNoise) {
        // Dynamically update noise covariance matrices
        // Q: Process Noise (Trust in Model/Velocity) - Lower = More Smooth/Laggy
        this.Q[0][0] = processNoise;
        this.Q[1][1] = processNoise;
        this.Q[2][2] = processNoise;
        this.Q[3][3] = processNoise;

        // R: Measurement Noise (Trust in Input) - Higher = More Smooth/Laggy
        this.R[0][0] = measurementNoise;
        this.R[1][1] = measurementNoise;
    }

    getPoint() {
        return { x: this.x[0], y: this.x[1] };
    }
}

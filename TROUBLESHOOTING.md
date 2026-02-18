
# 👁 LiverGuard Ocular Motor Test - Troubleshooting

If you are experiencing issues with the Eye Tracking features, please follow these steps.

## 1. Camera Access Issues
*   **"Camera Access Denied"**: Check your browser settings (lock icon in address bar) and ensure Camera permission is set to **Allow**.
*   **"Initializing..." Stuck**: The AI engine is large (~5MB). Give it a moment to load. If it takes longer than 10 seconds, refresh the page.
*   **Black Screen**: Ensure no other app (Zoom, Teams, etc.) is using your camera.

## 2. Calibration Tips
*   **Good Lighting**: Ensure your face is evenly lit. Avoid strong backlighting (windows behind you).
*   **Positioning**: Hold the phone at **arm's length** (approx 50-60cm).
*   **Open Eyes Wide**: The system needs a clear view of your iris. If you have drooping eyelids, open your eyes wide during the capture step.
*   **Hold Steady**: Keep your head still after calibration. Move only your eyes.

## 3. Algorithm Details
We use a **Hybrid CHT (Circular Hough Transform)** algorithm:
1.  **Phase A**: Scans for the circular shape of your iris in a static frame.
2.  **Phase B**: Tracks that specific iris pattern using rapid Template Matching.

If the tracker loses you, simply go back and **Recalibrate**.

## 4. Mobile Devices
*   **iPhone (iOS)**: Use **Safari**. Chrome on iOS has restricted camera access in some modes.
*   **Android**: Chrome is recommended.
*   **Power Saving**: Turn off "Low Power Mode" as it throttles the CPU needed for tracking.

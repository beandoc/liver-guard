# Ocular Gaze Tracking Update v1.2 - Release Notes

## Summary
Building on the P1 accuracy update, v1.2 introduces **Real-Time Signal Quality Feedback** and **Confidence-Weighted Analysis**. The system now visually communicates tracking reliability to the user and intelligently filters noise during post-analysis.

## New Features (P2 Implementation)

### 1. Visual Signal Quality Indicator
- **UI Update**: A 3-bar signal icon has been added to the top-right of the test screen (next to the REC indicator).
- **Logic**:
  - **3 Green Bars**: High Confidence (> 0.8). Optimal data quality.
  - **2 Green/Yellow Bars**: Good Confidence (> 0.5). Acceptable for analysis.
  - **1 Red Bar**: Low Confidence (< 0.5). Tracking is struggling (lighting/distance).
- **Purpose**: Provides immediate feedback to the clinician/user to adjust their position or lighting BEFORE the test completes.

### 2. Confidence-Weighted Analysis
- **Filtering**: `OcularAnalyzer.js` now discards data points with `confidence < 0.4` to prevent noise from skewing metrics.
- **Weighted Centroids**: Fixation stability calculation now uses a confidence-weighted average, allowing the system to ignore momentary tracking glips (e.g. partial blinks) when determining the true gaze center.
- **Smooth Pursuit Gain**: Gain calculation skips intervals where tracking confidence drops below 0.5.

## Deployment Checklist v1.2
1. **Signal Test**:
   - Cover one eye. Verify signal bars drop to Red (1 bar) or disappear.
   - Move into low light. Verify bars drop to Yellow/Red.
   - Sit perfectly still at 50cm. Verify 3 Green Bars.
2. **Analysis Verification**:
   - Check Results page after a test with intentional head movement. Scores should remain robust due to weighted filtering.

## Previous Updates (v1.1)
- Adaptive Kalman Smoothing.
- Distance Guard Rails.
- Iris-Relative Tracking.

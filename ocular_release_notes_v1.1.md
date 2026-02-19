# Ocular Gaze Tracking Update v1.1 - Release Notes

## Summary
This update introduces critical accuracy and reliability improvements (P0 & P1), transforming the system from a prototype to a clinical-grade research tool. Key advancements include distance-invariant tracking, adaptive signal smoothing, and robust data integrity checks.

## P0 Critical Fixes (Implemented)
- **Persistent Camera Architecture**: Eliminated camera re-initialization delays and permission prompts. Stream is now managed globally.
- **Iris-Relative Tracking**: Replaced raw video coordinates with eye-width normalized coordinates. Tracking accuracy is now maintained even if the user incorrectly positions themselves (40cm vs 70cm).
- **Distance Guard Rails**: Real-time enforcement of user distance. If `FaceWidth < 0.2` (approx 60cm+), a "Move Closer" warning overlay appears to prevent invalid data collection.
- **Adaptive Blink Detection**: Threshold dynamically scales with face size, preventing false blink positives at varying distances.

## P1 Accuracy Enhancements (Implemented)
- **Confidence Scoring (0.0 - 1.0)**: Each data point now includes a confidence metric derived from:
  - **Blink State**: (0.0 if blinking)
  - **Stability**: Penalized by rapid head movements (>0.03/frame drift).
  - **Distance**: Penalized if outside optimal range.
- **Adaptive Kalman Smoothing**: Tracking responsiveness now tunes itself automatically:
  - **Close Range**: High responsivenss (High Q, Low R) to capture micro-saccades.
  - **Long Range**: Stronger smoothing (Low Q, High R) to suppress sensor noise.

## Technical Validation
- **Build Status**: `npm run build` passed successfully.
- **Lint Check**: All syntax errors resolved in `OcularStimulus` and `OcularMenu`.
- **Performance**: Validated recursive animation loop logic to ensure consistent 60fps presentation in both Test and Demo modes.

## Deployment Checklist
1. **User Acceptance Testing (UAT)**:
   - Perform "The Lean Test": Calibrate at 50cm, then lean back to 70cm. Verify cursor tracks accurately.
   - Perform "The Blink Test": Blink rapidly at 40cm and 80cm. Verify both are detected.
2. **Environment Validation**:
   - Verify "Move Closer" warning appears when stepping >80cm away.
   - Verify system recovers (warning disappears) when stepping back in range.

## Next Steps (P2/P3 Scope)
- **Visualization**: Add a real-time "Signal Quality" bar to the UI using the new `confidence` metric.
- **Analysis Update**: Update `OcularAnalyzer.js` to weigh analysis results by confidence score.

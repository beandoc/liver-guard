/**
 * ARSessionManager.swift
 *
 * LiverGuard \u2014 Clinical Grade ARKit Eye Tracking Engine
 *
 * Runs an ARFaceTrackingConfiguration session on the TrueDepth camera.
 * At each frame (~60fps), extracts:
 *   - lookAtPoint (3D gaze vector in camera space)
 *   - leftEyeTransform / rightEyeTransform (6DOF eye pose)
 *   - blendShapes (eyeBlink*, eyeLook*, eyeWide*, eyeSquint*)
 *
 * The extracted data is serialized to JSON and pushed into the
 * WKWebView via evaluateJavaScript("window.__arkitGaze(...)").
 *
 * The React IrisTracker.js automatically detects and prioritizes
 * ARKit data when available (see _setupARKitBridge).
 */

import Foundation
import ARKit
import WebKit
import Combine

class ARSessionManager: NSObject, ObservableObject, ARSessionDelegate {

    // MARK: - Public
    var session = ARSession()
    weak var webView: WKWebView?

    @Published var isTracking = false
    @Published var faceDetected = false

    // MARK: - Private
    private var frameCount: Int = 0

    // MARK: - Lifecycle

    func start() {
        guard ARFaceTrackingConfiguration.isSupported else {
            print("[ARKit] Face tracking not supported on this device.")
            return
        }

        let config = ARFaceTrackingConfiguration()
        config.isLightEstimationEnabled = true
        // maximumNumberOfTrackedFaces defaults to 1 on face-tracking configs

        session.delegate = self
        session.run(config, options: [.resetTracking, .removeExistingAnchors])
        isTracking = true
        print("[ARKit] Session started \u2014 TrueDepth @ 60fps")
    }

    func stop() {
        session.pause()
        isTracking = false
        faceDetected = false
        print("[ARKit] Session stopped")
    }

    // MARK: - ARSessionDelegate

    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        guard let faceAnchor = anchors.first as? ARFaceAnchor else {
            faceDetected = false
            return
        }
        faceDetected = true
        frameCount += 1

        // --- Extract Gaze Data ---

        let look = faceAnchor.lookAtPoint // simd_float3 in face anchor space

        // --- Eye Blendshapes ---
        let bs = faceAnchor.blendShapes

        let leftBlink      = bs[.eyeBlinkLeft]?.floatValue   ?? 0
        let rightBlink     = bs[.eyeBlinkRight]?.floatValue  ?? 0
        let leftLookIn     = bs[.eyeLookInLeft]?.floatValue  ?? 0   // Looking toward nose
        let leftLookOut    = bs[.eyeLookOutLeft]?.floatValue ?? 0   // Looking away from nose
        let leftLookUp     = bs[.eyeLookUpLeft]?.floatValue  ?? 0
        let leftLookDown   = bs[.eyeLookDownLeft]?.floatValue ?? 0
        let rightLookIn    = bs[.eyeLookInRight]?.floatValue ?? 0
        let rightLookOut   = bs[.eyeLookOutRight]?.floatValue ?? 0
        let rightLookUp    = bs[.eyeLookUpRight]?.floatValue ?? 0
        let rightLookDown  = bs[.eyeLookDownRight]?.floatValue ?? 0

        // Composite gaze direction per eye (normalized -1 to +1)
        // Positive X = looking right, Positive Y = looking up
        let leftGazeX  = Double(leftLookOut - leftLookIn)    // Right is positive
        let leftGazeY  = Double(leftLookUp  - leftLookDown)  // Up is positive
        let rightGazeX = Double(rightLookIn - rightLookOut)   // Right is positive (mirrored)
        let rightGazeY = Double(rightLookUp - rightLookDown)  // Up is positive

        // --- Project lookAtPoint to Screen Coordinates ---
        // ARKit lookAtPoint is in face-anchor local space (meters)
        // Approximate screen mapping:
        //   X: face-space X maps to screen X (left/right)
        //   Y: face-space Y maps to screen Y (up/down, inverted)
        // At typical phone distance (~40cm), lookAtPoint X range is ~\u00b10.15m for edge-to-edge
        // We normalize to 0\u2013100% screen space
        let screenX = 50.0 + Double(look.x) * 200.0  // Scale heuristic
        let screenY = 50.0 - Double(look.y) * 200.0  // Invert Y axis

        let isBlinking = leftBlink > 0.5 || rightBlink > 0.5
        let confidence: Double = faceAnchor.isTracked ? 1.0 : 0.0

        // --- Head Pose (Euler angles in radians) ---
        let transform = faceAnchor.transform
        let pitch = Double(atan2(transform.columns.2.y, transform.columns.2.z)) // nodding
        let yaw   = Double(asin(-transform.columns.2.x))                        // turning
        let roll  = Double(atan2(transform.columns.1.x, transform.columns.0.x)) // tilting

        // --- Build JSON payload ---
        let payload: [String: Any] = [
            "timestamp": Date().timeIntervalSince1970 * 1000, // ms since epoch
            "frame": frameCount,
            "gaze": [
                "x": clamp(screenX, 0, 100),
                "y": clamp(screenY, 0, 100)
            ],
            "lookAtPoint": [
                "x": Double(look.x),
                "y": Double(look.y),
                "z": Double(look.z)
            ],
            "leftEye": [
                "lookRight": leftGazeX,
                "lookUp":    leftGazeY,
                "blink":     Double(leftBlink)
            ],
            "rightEye": [
                "lookRight": rightGazeX,
                "lookUp":    rightGazeY,
                "blink":     Double(rightBlink)
            ],
            "isBlinking": isBlinking,
            "confidence": confidence,
            "headPose": [
                "pitch": pitch,
                "yaw":   yaw,
                "roll":  roll
            ],
            "source": "arkit"
        ]

        // --- Inject into WKWebView ---
        injectGazeData(payload)
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        print("[ARKit] Session error: \(error.localizedDescription)")
        isTracking = false
    }

    func sessionWasInterrupted(_ session: ARSession) {
        print("[ARKit] Session interrupted")
        faceDetected = false
    }

    func sessionInterruptionEnded(_ session: ARSession) {
        print("[ARKit] Session interruption ended \u2014 resuming")
        start()
    }

    // MARK: - JavaScript Bridge

    private func injectGazeData(_ payload: [String: Any]) {
        guard let webView = webView else { return }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: payload, options: [])
            guard let jsonString = String(data: jsonData, encoding: .utf8) else { return }

            let script = "if(window.__arkitGaze){window.__arkitGaze(\(jsonString));}"

            DispatchQueue.main.async {
                webView.evaluateJavaScript(script) { _, error in
                    if let error = error {
                        // Only log first error to avoid console spam
                        if self.frameCount < 10 {
                            print("[ARKit\u2192JS] Bridge error: \(error.localizedDescription)")
                        }
                    }
                }
            }
        } catch {
            print("[ARKit] JSON serialization error: \(error)")
        }
    }

    // MARK: - Helpers

    private func clamp(_ value: Double, _ min: Double, _ max: Double) -> Double {
        return Swift.min(Swift.max(value, min), max)
    }
}

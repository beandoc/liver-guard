# LiverGuard iOS Native Tracker

## Overview
This directory contains the native Swift iOS companion app for the LiverGuard ocular movement test system. It wraps the React web application in a `WKWebView` while running an **ARKit face tracking session** in parallel, providing clinical-grade eye tracking data from the iPhone's TrueDepth camera.

## Architecture
```
ARKit (60fps TrueDepth)
  └── ARSessionManager.swift
        └── Extracts: lookAtPoint, blendShapes, headPose
        └── Serializes to JSON
        └── Injects via evaluateJavaScript()
              └── window.__arkitGaze({ gaze, leftEye, rightEye, ... })
                    └── IrisTracker.js (auto-detects ARKit data)
                          └── Prioritizes ARKit over MediaPipe
```

## Requirements
- **Device**: iPhone X or later (TrueDepth front camera)
- **iOS**: 16.0+
- **Xcode**: 15.0+
- **Deployment**: Must run on physical device (ARKit does not work in Simulator)

## Setup
1. Open Xcode and create a new SwiftUI project named `LiverGuardTracker`
2. Copy `ContentView.swift` and `ARSessionManager.swift` into the project
3. In `Info.plist`, add:
   - `NSCameraUsageDescription`: "LiverGuard needs camera access for clinical eye tracking"
4. Update `WEBAPP_URL` in `ContentView.swift` to point to your web app:
   - **Development**: `http://YOUR_MAC_IP:5173` (Vite dev server)
   - **Production**: `https://your-domain.com`
5. Build and run on a physical iPhone

## Data Flow
| Source | Data | Rate | Latency |
|--------|------|------|---------|
| ARKit `lookAtPoint` | 3D gaze vector (meters) | 60fps | <2ms |
| ARKit `blendShapes` | 52 facial coefficients (0.0–1.0) | 60fps | <2ms |
| ARKit `headPose` | Pitch, Yaw, Roll (radians) | 60fps | <2ms |

## Web Bridge Protocol
The Swift side calls `window.__arkitGaze(payload)` at 60fps with:
```json
{
  "timestamp": 1708012345678,
  "gaze": { "x": 52.3, "y": 48.1 },
  "leftEye": { "lookRight": 0.12, "lookUp": -0.03, "blink": 0.0 },
  "rightEye": { "lookRight": 0.14, "lookUp": -0.02, "blink": 0.0 },
  "isBlinking": false,
  "confidence": 1.0,
  "headPose": { "pitch": 0.03, "yaw": -0.01, "roll": 0.002 },
  "source": "arkit"
}
```

The `IrisTracker.js` in the React app automatically detects fresh ARKit frames and **bypasses** MediaPipe processing when native data is available.

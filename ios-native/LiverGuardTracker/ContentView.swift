/**
 * ContentView.swift
 *
 * LiverGuard Native iOS Tracker
 *
 * Hosts the React web application inside a WKWebView while running
 * an ARKit face tracking session in parallel. Gaze data from the
 * TrueDepth camera (lookAtPoint, blendShapes) is pushed into the
 * JavaScript layer at 60fps via window.__arkitGaze().
 *
 * Requirements:
 *   - iPhone X or later (TrueDepth camera)
 *   - iOS 16+ (ARKit 6)
 *   - Info.plist: NSCameraUsageDescription
 *
 * Usage:
 *   1. Build with Xcode 15+
 *   2. Deploy to a physical device (ARKit does not run in Simulator)
 *   3. Point WEBAPP_URL to your Vite dev server or production bundle
 */

import SwiftUI
import WebKit

// MARK: - Configuration
private let WEBAPP_URL = "https://your-liverguard-domain.com"
// For local development, use:
// private let WEBAPP_URL = "http://192.168.x.x:5173"

struct ContentView: View {
    @StateObject private var arManager = ARSessionManager()

    var body: some View {
        WebViewContainer(arManager: arManager)
            .ignoresSafeArea()
            .onAppear {
                arManager.start()
            }
            .onDisappear {
                arManager.stop()
            }
    }
}

// MARK: - WKWebView Container
struct WebViewContainer: UIViewRepresentable {
    @ObservedObject var arManager: ARSessionManager

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = false

        // Allow insecure local dev connections
        #if DEBUG
        webView.configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        #endif

        // Share reference with ARSessionManager for JS injection
        arManager.webView = webView

        if let url = URL(string: WEBAPP_URL) {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

#Preview {
    ContentView()
}

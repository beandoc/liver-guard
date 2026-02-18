# LiverGuard: Hepatic Encephalopathy Cognitive Suite

A specialized cognitive assessment tool designed for monitoring neurological function in patients with liver disease, specifically for detecting Minimal Hepatic Encephalopathy (MHE).

## Features

### 1. Number Connection Test A (Trails A)
- **Objective**: Connect numbers 1-10 in ascending order as quickly as possible.
- **Metrics**: 
  - Trace completion time (ms)
  - Comparison with previous attempts (>50% increase warning)

### 2. Stroop Color-Word Test
- **Objective**: Measure psychomotor speed and cognitive flexibility.
- **Two Stages**:
  - **OFF State**: Match the ink color of congruent stimuli (e.g., colored hashtags).
  - **ON State**: Match the ink color of discordant stimuli (e.g., word "RED" printed in blue ink).
- **Clinical Scoring**: 
  - Total Time (OFF + ON) calculation.
  - Risk categorization based on clinical thresholds (>269.8s Moderate Risk, >274.9s High Risk).

## Tech Stack
- **Framework**: React 19 + Vite
- **Styling**: Custom CSS with Glassmorphism design (No external UI libraries)
- **State Management**: React Context / Local State
- **Storage**: LocalStorage for session persistence

## Installation

```bash
git clone https://github.com/beandoc/liver-guard.git
cd liver-guard
npm install
npm run dev
```

## Disclaimer
This tool is for investigational and monitoring purposes. Clinical diagnosis should always be performed by a qualified healthcare professional.

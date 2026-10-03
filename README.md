# Asimov Controller

**Mobile Teleoperation and Telemetry Monitor for the Asimov 1 Humanoid Robot**

`asimov-controller` is an independent React Native / TypeScript Android application designed to control and monitor the **Virtual Asimov 1 MuJoCo simulation system** live over network.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Asimov Controller App                    │
│             (React Native / TypeScript)                │
│                                                        │
│  • VirtualJoystick (Movement & Steering)               │
│  • Action Keypad (STAND, DAMP, STOP, GET UP, SAFE FALL)│
│  • Camera Selector (1st, 2nd, 3rd Person Views)        │
│  • Live Simulation Viewport                            │
│  • Telemetry HUD (Pose, Velocities, Contacts, Faults)  │
└───────────────────────┬────────────────────────────────┘
                        │
         Dual-Channel Network Boundary
         • HTTP REST (8852) - Commands & Camera frames
         • WebSocket (8854) - ~25 Hz Telemetry frames
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│       Virtual Asimov Controller Gateway                │
│         (vasimov/web/server/gateway.py)                │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│           Virtual Edge / MuJoCo Physics                │
│             Asimov 1 Locomotion Policy                 │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ (Tested with Node v24)
- **npm** or yarn
- **Expo CLI** (`npx expo`)
- Optional for Android testing:
  - Android Studio with an Android Virtual Device (AVD), OR
  - Physical Android phone with **Expo Go** installed from Google Play.

### 2. Start the Virtual Asimov Simulator
In your `vasimov` simulation workspace:
```bash
cd /home/shubhr/Shubhr/Projects/vasimov
./run_sim.sh --web
```
This starts the physics simulation, interactive console, HTTP gateway (`8852`), and WebSocket server (`8854`).

### 3. Install & Test Controller App
In the `asimov-controller` directory:
```bash
cd /home/shubhr/Shubhr/Projects/asimov-controller

# Install dependencies
npm install

# Run unit tests
npm test

# Type-check TypeScript code
npm run type-check

# Start Expo development server
npm start
```

### 4. Running on Android
- **Android Virtual Device (Emulator):**
  ```bash
  npm run android
  ```
  On the Connect Screen, choose preset: `Android Emulator (10.0.2.2)` and tap `CONNECT`.
- **Physical Device:**
  Run `npm start` and scan the QR code with **Expo Go**. Enter your PC's LAN IP (e.g. `192.168.1.xxx`) and tap `CONNECT`.

---

## 🎮 Controller Features & Controls

| Component | Functionality |
| :--- | :--- |
| **Virtual Joystick** | Circle-bounded touch responder. Drag up/down for forward/reverse velocity ($v_x$). Drag left/right to steer heading yaw ($\omega_z$). Auto-centers and zeros on release. |
| **`[ STAND ]`** | Clears velocity commands and ramps robot into upright standing pose. |
| **`[ DAMP ]`** | Engages compliant joint damping mode (safe rest / parking). |
| **`[ STOP ]`** | Zeros velocity commands and holds balance. |
| **`[ GET UP ]`** | Clears faults and restores upright standing posture. |
| **`[ SAFE FALL ]`** | Triggers controlled collapse into compliant damping. |
| **`[ CAMERA ]`** | Switches between **`FIRST`** (eye-level head FPV), **`THIRD`** (pelvis chase view), and **`SECOND`** (front arena view). |
| **Telemetry HUD** | Real-time display of robot mode, base height, orientation (roll/pitch/yaw), linear & angular velocities, foot contacts, and battery/fault status. |

---

## 📚 Technical Documentation

- **[CONTROLLER_API.md](file:///home/shubhr/Shubhr/Projects/asimov-controller/CONTROLLER_API.md)**: Formal protocol specification covering command schemas, telemetry frames, camera APIs, error codes, and versioning.
- **[FURTHER_DEVELOPMENT.md](file:///home/shubhr/Shubhr/Projects/asimov-controller/FURTHER_DEVELOPMENT.md)**: Comprehensive handover manual detailing directory structures, state management, testing, Android builds, policy integration (`asimov1-getup-safefall`), and the 8-phase roadmap.

---

## ⚠️ Known Limitations & Implementation Notes

- **Camera Viewport Stream**: The MVP implementation uses periodic HTTP snapshot polling (`GET /api/camera/frame?camera=<name>`) at ~12.5 FPS. This guarantees universal compatibility without requiring custom C++ WebRTC or MJPEG decoders. Phase 2 roadmap includes native WebRTC/MJPEG decoder integration.
- **Hugging Face Recovery Model Execution**: VASIMOV includes policy registry hooks for `asimov1-getup-safefall`. The mobile app dispatches `getup` and `safefall` commands to this backend architecture.

---

## 🧪 Testing

The repository includes a comprehensive Jest test suite verifying:
- Joystick touch normalization and deadzone calculation
- Velocity command mapping to physical limits
- Telemetry frame ingestion and fault flag decoding
- Camera perspective mappings
- REST & WebSocket lifecycle state transitions

Run all tests:
```bash
npm test
```

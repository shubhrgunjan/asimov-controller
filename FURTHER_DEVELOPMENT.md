# Asimov Controller — Further Development Guide & Architecture Manual

**Audience:** Incoming React Native & Mobile Engineering Team  
**Project:** `asimov-controller`  
**Target Platform:** Android (Physical Devices & Emulators), Cross-Platform Compatible (iOS / Web)  
**Status:** MVP Handover Complete (`IMPLEMENTED & VERIFIED`)  

---

## 1. Project Purpose

`asimov-controller` is a standalone mobile application for monitoring and controlling the **Asimov 1 Humanoid Robot** live.

Currently, it connects to the running **Virtual Asimov (MuJoCo) simulation system** through the Controller Gateway (`vasimov/web/server/gateway.py`). Later, the exact same mobile app architecture will connect to real physical Asimov 1 robots via the Menlo Edge board.

### Critical Architecture Separation Principle
- **The mobile application is strictly a client and controller.**
- It does **NOT** run the physics engine or simulate the robot.
- It does **NOT** import MuJoCo C/Python bindings.
- It does **NOT** manipulate raw motor torques directly.
- It interacts solely across the defined **Controller API Boundary** (`CONTROLLER_API.md`).

---

## 2. Current Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Application                        │
│                                                                        │
│   ┌────────────────────┐                   ┌───────────────────────┐   │
│   │   ConnectScreen    │                   │   ControllerScreen    │   │
│   └─────────┬──────────┘                   └───────────┬───────────┘   │
│             │                                          │               │
│             ▼                                          ▼               │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 useRobotStore (State Layer)                    │   │
│   └──────┬──────────────────────┬──────────────────────────┬───────┘   │
│          │                      │                          │           │
│          ▼                      ▼                          ▼           │
│   ┌──────────────┐      ┌──────────────┐           ┌───────────────┐   │
│   │ CameraService│      │RobotControl  │           │ TelemetrySvc  │   │
│   └──────┬───────┘      └───────┬──────┘           └───────▲───────┘   │
│          │                      │                          │           │
│          ▼                      ▼                          │           │
│   ┌──────────────┐      ┌──────────────┐           ┌───────┴───────┐   │
│   │  RestClient  │      │ 20Hz Throttle│           │WebSocketClient│   │
│   │ (HTTP 8852)  │      │ Command Loop │           │  (WS 8854)    │   │
│   └──────┬───────┘      └───────┬──────┘           └───────▲───────┘   │
└──────────┼──────────────────────┼──────────────────────────┼───────────┘
           │                      │                          │
           │           NETWORK BOUNDARY (LAN / USB / WiFi)   │
           ▼                      ▼                          │
┌────────────────────────────────────────────────────────────┴───────────┐
│                    Virtual Asimov Controller Gateway                   │
│                     (vasimov/web/server/gateway.py)                    │
│                                                                        │
│   • HTTP Server (8852): REST API & Camera Snapshot Streaming           │
│   • WebSocket Server (8854): Canonical Telemetry Broadcast (~25 Hz)    │
│   • ControlHandler: 6-Stage Command Validation & Lifecycle Logging     │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Virtual Edge (EdgeCore)                         │
│   Safety Limits • Fault Latching • State Machine (DAMP/STAND/MOVE)     │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MuJoCo Physics Engine                           │
│   Asimov 1 Humanoid Model (23 Actuators, differential ankles)          │
│   Active Locomotion ONNX Policy (78-D Observations ➔ 23-D Actions)     │
│   Camera Views: first_person_camera, chase_camera, front_camera        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure

```text
asimov-controller/
├── App.tsx                     # Top-level screen router and theme wrapper
├── index.ts                    # Entry point registering App with Expo / React Native
├── app.json                    # Expo application metadata configuration
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler options (strict, jest types)
├── jest.config.js              # Unit testing configuration (ts-jest)
├── CONTROLLER_API.md           # Formal API protocol specification
├── FURTHER_DEVELOPMENT.md      # This engineering manual
├── README.md                   # Quickstart and overview documentation
│
├── src/
│   ├── config/
│   │   └── index.ts            # Network defaults, joystick rates, velocity bounds
│   │
│   ├── types/
│   │   ├── camera.ts           # CameraMode, SimulatorCamera, CAMERA_DEFINITIONS
│   │   ├── connection.ts       # ConnectionState, ConnectionConfig, ConnectionStats
│   │   ├── controller.ts       # ControllerAction, CommandAck, RobotControllerInterface
│   │   ├── telemetry.ts        # RobotTelemetry, BaseTelemetry, Contacts, Faults
│   │   └── index.ts            # Barrel export
│   │
│   ├── utils/
│   │   ├── math.ts             # Normalization, circle clamping, deadzones, velocity mapping
│   │   └── formatting.ts       # Units formatting, angle formatting, fault bitmask decoding
│   │
│   ├── services/
│   │   ├── transport/
│   │   │   ├── RestClient.ts       # HTTP client with timeouts for /api/control & /api/camera
│   │   │   ├── WebSocketClient.ts  # Auto-reconnecting WS client for ~25 Hz telemetry
│   │   │   └── index.ts
│   │   ├── telemetry/
│   │   │   └── TelemetryService.ts # Canonical frame parser with safe defaults
│   │   ├── camera/
│   │   │   └── CameraService.ts    # Perspective resolution and URL generation
│   │   └── controller/
│   │       └── RobotController.ts  # 20 Hz throttled command loop, high-level action APIs
│   │
│   ├── state/
│   │   └── useRobotStore.ts    # Centralized React hook keeping transport decoupled from UI
│   │
│   ├── components/
│   │   ├── VirtualJoystick/    # Touch responder joystick with visual knob & deadzone
│   │   ├── ControlButton/      # Gamepad style action buttons with loading/disabled states
│   │   ├── CameraSelector/     # Segmented selector for FIRST, THIRD, SECOND cameras
│   │   ├── ConnectionIndicator/# Real-time status pill with latency counter
│   │   ├── RobotViewport/      # Live MuJoCo camera viewport with snapshot streaming
│   │   └── TelemetryPanel/     # Compact HUD (mode, base height, angles, foot contacts)
│   │
│   └── screens/
│       ├── ConnectScreen.tsx   # Server configuration & emulator/LAN quick-connect
│       └── ControllerScreen.tsx# Game controller layout with viewport, joystick, and keypad
│
└── tests/
    ├── joystick.test.ts        # Joystick math, deadzones, and velocity contract clamping
    ├── camera.test.ts          # Camera mode mappings to MuJoCo camera entities
    ├── telemetry.test.ts       # Telemetry frame parsing, fault bitmask decoding
    ├── controller.test.ts      # Command serialization, action APIs, lifecycle handling
    └── transport.test.ts       # REST client, WebSocket client states, and error handling
```

---

## 4. Technology Stack

- **Framework:** React Native `0.86.3` with Expo `~57.0.26`
- **Language:** TypeScript `~6.0.3` (Strict mode enabled)
- **Testing:** Jest `30.5.2` with `ts-jest` (40 unit tests passing)
- **Styling:** Vanilla React Native `StyleSheet` (no bloated CSS frameworks)
- **Networking:** Native `fetch` (HTTP 1.1) and native `WebSocket` API

---

## 5. Backend Contract & Protocol

Full schema definitions are in [CONTROLLER_API.md](file:///home/shubhr/Shubhr/Projects/asimov-controller/CONTROLLER_API.md).

### Core Summary:
1. **Command Endpoint:** `POST http://<host>:8852/api/control`
   ```json
   { "action": "walk", "params": { "vx": 0.4, "vy": 0.0, "wz": 0.2 } }
   ```
2. **Telemetry WebSocket:** `ws://<host>:8854` (pushes 25 Hz JSON frames).
3. **Camera Frame Endpoint:** `GET http://<host>:8852/api/camera/frame?camera=<name>&t=<timestamp>`

---

## 6. Real-Time Communication Architecture

The system strictly decouples the three communication channels:

```text
1. COMMAND CHANNEL (App ➔ Gateway):
   - Fast WebSocket push when online, fallback to HTTP POST.
   - Throttled at 20 Hz to match locomotion policy command evaluation.
   - Stop command emitted once upon joystick release (prevents network saturation).

2. TELEMETRY CHANNEL (Gateway ➔ App):
   - Unidirectional push from Gateway WebSocket at ~25 Hz.
   - Ingested by TelemetryService.parseFrame and pushed to state store.
   - UI re-renders isolated to TelemetryPanel via structured props.

3. VIDEO CHANNEL (MuJoCo ➔ App):
   - Rendered by MuJoCo offscreen OpenGL context.
   - Polled via HTTP snapshots (/api/camera/frame) at ~12.5 FPS.
   - Independent from telemetry and command packet loops.
```

---

## 7. Camera Architecture

The mobile app does not invent arbitrary cameras. It queries the 3 simulator cameras:

| Mode in Mobile UI | MuJoCo Entity | Anchor Body | Perspective Details |
| :--- | :--- | :--- | :--- |
| **`FIRST`** | `first_person_camera` | `neck_pitch_link` | Robot eye-level forward-facing camera. Moves with head/neck. |
| **`THIRD`** | `chase_camera` | `pelvis_link` | Follow-camera positioned 1.5m behind pelvis. Turns with robot heading. |
| **`SECOND`** | `front_camera` | `worldbody` | Elevated front observation view pointing toward the robot. |

---

## 8. Robot Control & Joystick Architecture

```text
User touches screen
        │
        ▼
VirtualJoystick.tsx (TouchResponder)
        │ - Computes raw touch delta (dx, dy)
        │ - Normalizes to unit circle [-1.0, 1.0]
        │ - Filters inside 8% deadzone
        ▼
useRobotStore.setJoystickPosition(x, y)
        │
        ▼
math.mapJoystickToVelocity(joyX, joyY)
        │ - joyY > 0 -> vx = joyY * VX_MAX (1.0 m/s)
        │ - joyY < 0 -> vx = -joyY * VX_MIN (-0.5 m/s)
        │ - joyX     -> wz = -joyX * WZ_MAX (0.8 rad/s CCW)
        ▼
RobotController.setTargetVelocity(vx, vy, wz)
        │ (Buffers target values in memory)
        ▼
Periodic 20 Hz Command Loop (tick every 50ms)
        │ - Checks if target changed by > 0.01
        │ - If moving: sends `walk` command
        │ - If zeroed: sends single `stop` command and idles
        ▼
Virtual Asimov EdgeCore
```

---

## 9. Policy Integration (`asimov1-getup-safefall`)

### Current Status
- **Official Locomotion ONNX:** `IMPLEMENTED & ACTIVE` (Runs Menlo policy checkpoint).
- **Getup / Recovery Action:** `IMPLEMENTED & VERIFIED` in `ControlHandler` (`action = "getup"` clears faults, restores base upright height, arms standing pose).
- **Safe Fall Action:** `IMPLEMENTED & VERIFIED` in `ControlHandler` (`action = "safefall"` triggers controlled collapse into compliant damping).
- **Direct Hugging Face Policy Model Execution (`openhorizon-labs/asimov1-getup-safefall`):** `PARTIALLY INTEGRATED`. The policy checkpoint structure exists in `policies/custom/getup_safefall/`. VASIMOV's `PolicyRegistry` discovers it. When active, it takes control of the 23-DOF recovery trajectory.

### Integration Point for Future Developers:
- The mobile app button `[ GET UP ]` dispatches `action = "getup"`.
- The mobile app button `[ SAFE FALL ]` dispatches `action = "safefall"`.
- Future policy submodes (e.g. `FALLING`, `RECOVERING`, `RECOVERED`) are streamed via `telemetry.submode` and displayed in `TelemetryPanel`.

---

## 10. Safety Architecture

Safety is handled by **defense-in-depth**:
1. **Client-side Clipping (App):** Joystick velocity inputs are strictly bounded to `[-0.5, 1.0]` for $v_x$, `[-0.3, 0.3]` for $v_y$, and `[-0.8, 0.8]` for $\omega_z$.
2. **Gateway-side Validation (`ControlHandler`):** Checks firmware latch flags. If robot is fault-latched (e.g. after a hard fall), commands are rejected with explicit reason.
3. **EdgeCore Firmware Safety:** Heartbeat watchdog timers (auto-zero velocity if commands cease for >200ms), tilt limit checks (>60° triggers automatic compliant DAMP).

---

## 11. How to Run

### Step 1: Start the Virtual Asimov Simulator
In the `vasimov` project directory:
```bash
cd /home/shubhr/Shubhr/Projects/vasimov
./run_sim.sh --web
```
This starts:
- MuJoCo 3D Viewer
- HTTP Gateway on `0.0.0.0:8852`
- WebSocket Telemetry on `0.0.0.0:8854`

### Step 2: Start the Controller Application
In the `asimov-controller` project directory:
```bash
cd /home/shubhr/Shubhr/Projects/asimov-controller

# Install dependencies (if not already installed)
npm install

# Run unit tests
npm test

# Run TypeScript compiler check
npm run type-check

# Start Expo dev server
npm start
```

---

## 12. Android Development Guide

### A. Android Emulator Setup
1. Open Android Studio and launch any Android Virtual Device (AVD).
2. Run:
   ```bash
   npm run android
   ```
3. In the Connect Screen, select preset: `Android Emulator (10.0.2.2)`.
4. Press `CONNECT TO SIMULATOR`.

### B. Physical Android Phone (over Wi-Fi LAN)
1. Ensure both your PC and Android phone are connected to the same Wi-Fi network.
2. Determine your PC's LAN IP:
   ```bash
   hostname -I | awk '{print $1}'
   # Example: 192.168.1.120
   ```
3. Open Expo Go on your Android phone and scan the QR code from `npm start`.
4. On the Connect Screen, enter your PC's IP (`192.168.1.120`), HTTP port `8852`, WS port `8854`.
5. Tap `CONNECT TO SIMULATOR`.

### C. USB Debugging with ADB Port Forwarding (Zero-Latency Local Option)
If Wi-Fi LAN has high packet drop, forward ports over USB:
```bash
adb reverse tcp:8852 tcp:8852
adb reverse tcp:8854 tcp:8854
```
Then connect to `127.0.0.1` inside the app.

---

## 13. React Native Takeover Guide

Here is where the React Native engineering team should work based on objectives:

| Goal | Target Directory / Files |
| :--- | :--- |
| **Redesign UI / Themes** | `src/components/`, `src/screens/ControllerScreen.tsx` |
| **Add New Robot Controls** | Add action to `src/types/controller.ts`, dispatch in `src/services/controller/RobotController.ts`, add button in `ControllerScreen.tsx` |
| **Add New Telemetry Metrics** | Update `src/types/telemetry.ts`, update `src/services/telemetry/TelemetryService.ts`, display in `src/components/TelemetryPanel/` |
| **Add New Camera Perspective** | Add definition in `src/types/camera.ts` (`CAMERA_DEFINITIONS`), update `CameraSelector.tsx` |
| **Change Networking / Transport** | `src/services/transport/RestClient.ts` and `WebSocketClient.ts` |
| **Upgrade Video to WebRTC / Native MJPEG** | Replace `<Image>` polling in `src/components/RobotViewport/RobotViewport.tsx` with WebRTC / LiveKit view |

---

## 14. Phased Development Roadmap

### Phase 1: Current MVP (`COMPLETED`)
- Standalone Expo + React Native + TypeScript project.
- Dual-channel REST + WebSocket transport.
- Reusable `VirtualJoystick` with normalized clamping and deadzone filtering.
- Reusable `ControlButton` keypad with `STAND`, `DAMP`, `STOP`, `GET UP`, `SAFE FALL`.
- 3-Camera viewpoint selector (`FIRST`, `THIRD`, `SECOND`) mapped to MuJoCo cameras.
- Real-time simulation viewport with snapshot stream.
- Structured Telemetry HUD.
- 40 automated unit tests passing.

### Phase 2: Professional Controller UI
- Landscape orientation lock and gamepad haptic feedback (`expo-haptics`).
- Dual virtual sticks (Left: translation $v_x, v_y$; Right: rotational look yaw/pitch).
- Custom HUD layout with draggable/minimizable telemetry tiles.

### Phase 3: Advanced Telemetry & Graphing
- Real-time 2D center-of-mass (CoM) vs support polygon visualizer.
- Joint temperature and torque distribution heatmaps.
- Historical time-series plots for base height and velocities.

### Phase 4: Full Policy Execution Controls
- Policy selector dropdown (Locomotion, Recovery, Fall-protection, Dance/Emotes).
- Dynamic obstacle spawner button with distance slider.
- Step-by-step recovery trajectory animator.

### Phase 5: Multi-Robot Fleet Control
- Robot discovery protocol via mDNS / ZeroConf.
- Multi-robot selector allowing switching between humanoid units.

### Phase 6: Authentication & Production Security
- Mutual TLS (mTLS) or JWT authentication headers for commands.
- Encrypted WebSocket (`wss://`) and HTTPS (`https://`).
- Role-based control permissions (Observer vs Operator).

### Phase 7: Real Asimov Hardware Integration
- Swap `SimBackend` gateway with Menlo Edge CAN bridge.
- Direct hardware battery management telemetry.
- Physical E-Stop button integration with hardware interlock.

### Phase 8: Production App Store Release
- Standalone APK and AAB release builds via EAS (`eas build --platform android`).
- Continuous integration pipeline running `npm test` and `tsc --noEmit`.

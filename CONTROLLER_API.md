# Asimov Controller Gateway API Specification

**Version:** 1.0.0  
**Protocol Status:** STABLE  
**Target Systems:** Virtual Asimov 1 (MuJoCo Sim & EdgeCore), Physical Asimov 1 (Future)

---

## 1. Overview & Architecture Boundary

The `asimov-controller` communicates with the Virtual Asimov system via a dual-channel gateway:
1. **HTTP REST API (Default port: `8852`)**: Command dispatch, state snapshots, and camera video/image frames.
2. **WebSocket Streaming API (Default port: `8854`)**: Real-time bidirectional telemetry frames (~25 Hz) and instant command dispatch with lifecycle acknowledgement.

```text
┌────────────────────────────────────────────────────────┐
│               Asimov Controller App                    │
│             (React Native / TypeScript)                │
└───────────────────────┬────────────────────────────────┘
                        │
       HTTP REST (8852) │  WebSocket (8854)
       - POST /api/control - TelemetryStream (~25Hz)
       - GET  /api/camera  - Low-latency Ack
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│          Virtual Asimov Controller Gateway             │
│            (vasimov/web/server/gateway.py)             │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│             Virtual Edge (EdgeCore)                    │
│      Safety Filter / State Machine / Watchdogs         │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│                   MuJoCo Simulator                     │
│               Asimov 1 Robot Physics                   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Network & Connection Protocols

### 2.1 Default Port Allocation
| Service | Protocol | Default Port | Description |
| :--- | :--- | :--- | :--- |
| **REST Gateway** | HTTP 1.1 | `8852` | Commands, state snapshot, camera snapshots & MJPEG stream |
| **Telemetry Stream** | WebSocket (ws://) | `8854` | Canonical telemetry frames (~25 Hz), fast bidirectional ack |

### 2.2 Host Resolution (LAN & Emulators)
- **Android Emulator**: `10.0.2.2` (routes to host machine localhost).
- **Physical Device**: Host machine LAN IP (e.g. `192.168.1.x`).
- **Web / Simulator Machine**: `127.0.0.1` or `localhost`.
- **Gateway Binding**: Binds to `0.0.0.0` by default when `--web` is passed to `./run_sim.sh`.

---

## 3. Command API (`POST /api/control` & WebSocket Dispatch)

### 3.1 Command Lifecycle Contract
Every control command executes through a mandatory 6-stage lifecycle:
```text
CLIENT REQUEST ➔ GATEWAY PARSED ➔ EDGE VALIDATED ➔ ACCEPTED/REJECTED ➔ APPLIED ➔ SIMULATOR RESULT
```

### 3.2 Request Format
#### HTTP REST: `POST /api/control`
```json
{
  "action": "<action_name>",
  "params": { ... }
}
```

#### WebSocket Dispatch: Send to `ws://<host>:8854`
```json
{
  "action": "<action_name>",
  "params": { ... }
}
```

### 3.3 Response / Acknowledgement Schema
```json
{
  "command_id": 14,
  "action": "walk",
  "timestamp": 1727800042.128,
  "sim_time": 12.450,
  "status": "accepted",
  "lifecycle": {
    "user_input": "walk {'vx': 0.4, 'vy': 0.0, 'wz': 0.2}",
    "parsed": {
      "requested": { "vx": 0.4, "vy": 0.0, "wz": 0.2 }
    },
    "validation": "OK",
    "clipped": false,
    "effective": { "vx": 0.4, "vy": 0.0, "wz": 0.2 },
    "applied": "MOVE/POLICY vx=+0.40, vy=+0.00, wz=+0.20",
    "simulator_result": "mode = MOVE/WALK_POLICY"
  }
}
```

Status codes:
- `"accepted"`: Command validated, safety checks passed, applied to EdgeCore.
- `"rejected"`: Command rejected by safety layer (e.g. latched firmware fault, illegal transition).
- `"error"`: Malformed request or exception during execution.

---

### 3.4 Supported Commands

#### 1. `stand`
- **Description**: Clears velocity command and ramps the humanoid to its default upright standing pose over a 2.0s settling trajectory.
- **Parameters**: None.
- **Preconditions**: Robot must not have a latched unrecovered fault (`core.fault_latched == false`).
- **Postconditions**: `mode = STAND`, arm standing trajectory engaged.

#### 2. `damp`
- **Description**: Engages compliant joint damping mode (zero torque, pure velocity damping). Used for parking, safe setting down, or resting.
- **Parameters**: None.
- **Postconditions**: `mode = DAMP`.

#### 3. `walk`
- **Description**: Commands locomotion policy with linear and angular velocities.
- **Parameters**:
  ```json
  {
    "vx": 0.4,
    "vy": 0.0,
    "wz": -0.2
  }
  ```
  - `vx`: Forward (+) / reverse (-) velocity in m/s. Range: `[-0.5, 1.0]`.
  - `vy`: Lateral left (+) / right (-) velocity in m/s. Range: `[-0.3, 0.3]`.
  - `wz`: Yaw heading rate CCW (+) / CW (-) in rad/s. Range: `[-0.8, 0.8]`.
- **Note**: Values outside safety limits are clipped automatically and flagged in `lifecycle.clipped = true`.

#### 4. `stop`
- **Description**: Commands zero velocity (`vx=0, vy=0, wz=0`) while holding active balance in locomotion policy.
- **Parameters**: None.

#### 5. `fall` / `safefall`
- **Description**: Triggers safe controlled fall into compliant DAMP mode.
- **Parameters**: None.

#### 6. `getup` / `recover`
- **Description**: Clears latched faults, resets base upright height, and transitions to standing mode.
- **Parameters**: None.

#### 7. `reset`
- **Description**: Reinitializes the MuJoCo simulation environment to initial keyframe pose.
- **Parameters**: `{"seed": 42}` (optional integer seed).

---

## 4. Telemetry Stream Protocol (`ws://<host>:8854`)

### 4.1 Broadcast Cadence
- Broadcast rate: **~25 Hz** (every ~40ms).
- Transport: JSON text frames over WebSocket.

### 4.2 Canonical Telemetry Frame Schema
```json
{
  "sequence": 1420,
  "sim_time": 28.405,
  "wall_time": 1727800042.85,
  "control_mode": "policy",
  "edge_mode": "MOVE",
  "move_submode": "WALK_POLICY",
  "paused": false,
  "base": {
    "position": [0.45, 0.02, 0.612],
    "orientation_quat": [0.998, 0.005, 0.012, 0.045],
    "roll_deg": 1.4,
    "pitch_deg": -0.8,
    "yaw_deg": 5.2,
    "linear_velocity_body": [0.38, -0.02, 0.01],
    "angular_velocity_body": [0.01, 0.02, -0.15]
  },
  "contacts": {
    "left_foot": true,
    "right_foot": false,
    "active_contacts_count": 2
  },
  "faults": {
    "latched": false,
    "error_flags": 0,
    "fall_detected": false,
    "tilt_angle_deg": 1.6
  },
  "policy": {
    "name": "official_locomotion",
    "step_count": 1130,
    "healthy": true
  },
  "environment": {
    "preset": "flat",
    "ground_friction": 1.0,
    "gantry_active": false
  },
  "battery": {
    "soc_percent": 96.0,
    "discharge_rate_w": 152.0,
    "estimated_remaining_sec": 7000
  }
}
```

---

## 5. Camera System API

The controller exposes three virtual camera viewpoints mapped directly to MuJoCo camera objects:

| Mobile Camera Mode | MuJoCo Camera Name | Mount / Anchor | Perspective | Implementation Status |
| :--- | :--- | :--- | :--- | :--- |
| `FIRST` | `first_person_camera` | `neck_pitch_link` | Robot eye-level forward FPV | `IMPLEMENTED` |
| `THIRD` | `chase_camera` | `pelvis_link` | Follower 1.5m behind pelvis | `IMPLEMENTED` |
| `SECOND` | `front_camera` | Arena / `worldbody` | Front elevated overview | `IMPLEMENTED` |

### 5.1 Image Snapshot Endpoint (Primary Viewport Mode)
```http
GET /api/camera/frame?camera=<sim_camera_name>&t=<cache_buster>
```
- Returns `image/jpeg` containing the latest rendered frame buffer.
- Recommended refresh rate: 10–15 FPS.

### 5.2 Multipart MJPEG Stream Endpoint
```http
GET /api/camera/stream?camera=<sim_camera_name>
```
- Content-Type: `multipart/x-mixed-replace; boundary=vasimov_frame_boundary`
- Streams JPEG frames at ~25 FPS.

---

## 6. Safety & Fault Matrix

| Error Flag Bit | Name | Trigger Condition | System Action |
| :--- | :--- | :--- | :--- |
| `0x01` | `FALL_DETECTED` | Body tilt angle > 60° | Firmware latches fault, transitions to DAMP |
| `0x02` | `JOINT_LIMIT` | Joint qpos outside mechanical limits | Trajectory clamped, warning recorded |
| `0x04` | `MOTOR_OVERTEMP`| Motor temperature > 80°C | Current limits derated |
| `0x08` | `CAN_BUS_ERROR` | CAN communications lost | E-STOP compliant damp engaged |
| `0x10` | `WATCHDOG_TIMEOUT`| Control command heartbeat > 200ms | Velocity auto-zeroed |

---

## 7. Versioning & Backward Compatibility

1. **Protocol Stability**: The payload format defined in this document is backwards-compatible. New telemetry fields will be appended to sub-objects without altering existing keys.
2. **Unknown Fields**: Client parsers MUST ignore unknown top-level keys to allow seamless server-side upgrades.
3. **Hardware Transition**: When transitioning from MuJoCo to real Asimov 1 hardware, the gateway API will remain identical; the underlying backend will swap `SimBackend` with the hardware CAN interface.

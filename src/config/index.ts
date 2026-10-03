/**
 * Asimov Controller - Global Configuration & Defaults
 */

import { ConnectionConfig } from '../types/connection';

export const APP_CONFIG = {
  appName: 'Asimov Controller',
  version: '1.0.0-mvp',
  author: 'Asimov Robotics & Menlo Research',
};

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  // Defaults to the host machine's Wi-Fi LAN IP for physical device testing
  host: '10.10.186.186',
  httpPort: 8852,
  wsPort: 8854,
  autoReconnect: true,
  reconnectIntervalMs: 2000,
  heartbeatIntervalMs: 5000,
  telemetryTimeoutMs: 3000,
};

/**
 * Common quick-connect presets for developer convenience
 */
export const CONNECTION_PRESETS = [
  { label: 'Wi-Fi (GALGOTIAS-ARUBA 10.10.186.186)', host: '10.10.186.186' },
  { label: 'Ethernet LAN (10.10.186.8)', host: '10.10.186.8' },
  { label: 'USB / Localhost (127.0.0.1)', host: '127.0.0.1' },
  { label: 'Android Emulator (10.0.2.2)', host: '10.0.2.2' },
];

/**
 * Robot Velocity Limits (enforced by EdgeCore / locomotion policy contract)
 */
export const VELOCITY_LIMITS = {
  VX_MIN: -0.5, // max reverse speed (m/s)
  VX_MAX: 1.0,  // max forward speed (m/s)
  VY_MIN: -0.3, // max lateral right speed (m/s)
  VY_MAX: 0.3,  // max lateral left speed (m/s)
  WZ_MIN: -0.8, // max clockwise yaw rate (rad/s)
  WZ_MAX: 0.8,  // max counter-clockwise yaw rate (rad/s)
};

/**
 * Interactive Control Timing
 */
export const TIMING_CONFIG = {
  // Rate at which throttled joystick updates are dispatched to the backend
  JOYSTICK_DISPATCH_HZ: 20, // 50ms loop
  JOYSTICK_DISPATCH_INTERVAL_MS: 50,

  // Deadzone radius for joystick input (0.0 to 1.0)
  JOYSTICK_DEADZONE: 0.08,

  // Camera viewport refresh rate for snapshot mode (ms per frame)
  CAMERA_SNAPSHOT_INTERVAL_MS: 80, // ~12.5 FPS snapshot polling
};

/**
 * Asimov Controller - Mathematical Utilities
 */

import { VELOCITY_LIMITS } from '../config';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) {
    return 0.0;
  }
  // Rescale so output starts continuously at 0 above deadzone
  const sign = Math.sign(value);
  const normalized = (Math.abs(value) - deadzone) / (1.0 - deadzone);
  return sign * clamp(normalized, 0.0, 1.0);
}

export interface NormalizedJoystick {
  x: number; // [-1.0, 1.0] (Right +, Left -)
  y: number; // [-1.0, 1.0] (Up/Forward +, Down/Backward -)
  magnitude: number; // [0.0, 1.0]
  angleRad: number;
}

/**
 * Normalizes raw pixel touch displacement into circle-bounded coordinates [-1, 1].
 */
export function normalizeJoystickInput(
  deltaX: number,
  deltaY: number,
  radius: number,
  deadzone: number = 0.08
): NormalizedJoystick {
  if (radius <= 0) {
    return { x: 0, y: 0, magnitude: 0, angleRad: 0 };
  }

  // Calculate raw polar coordinates
  const dist = Math.hypot(deltaX, deltaY);
  const rawMagnitude = Math.min(dist / radius, 1.0);
  const angleRad = Math.atan2(deltaY, deltaX);

  // Apply deadzone to magnitude
  const magnitude = applyDeadzone(rawMagnitude, deadzone);

  if (magnitude === 0) {
    return { x: 0, y: 0, magnitude: 0, angleRad };
  }

  // Reconstruct cartesian coordinates in unit circle
  // Note: On screen Y increases downwards; we invert Y so up is positive (forward).
  const nx = Math.cos(angleRad) * magnitude;
  const ny = -Math.sin(angleRad) * magnitude;

  return {
    x: clamp(nx, -1.0, 1.0),
    y: clamp(ny, -1.0, 1.0),
    magnitude,
    angleRad,
  };
}

/**
 * Maps normalized joystick coordinates to physical robot velocities:
 * - joyY > 0 -> Forward velocity vx in [0, VX_MAX]
 * - joyY < 0 -> Reverse velocity vx in [VX_MIN, 0]
 * - joyX -> Yaw rate wz in [WZ_MIN, WZ_MAX] (negative turns right, positive turns left)
 */
export function mapJoystickToVelocity(
  joyX: number,
  joyY: number,
  limits = VELOCITY_LIMITS
): { vx: number; vy: number; wz: number } {
  // Forward / reverse mapping
  let vx = 0;
  if (joyY >= 0) {
    vx = joyY * limits.VX_MAX;
  } else {
    vx = -joyY * limits.VX_MIN; // joyY is negative, VX_MIN is negative -> positive * negative = negative
  }

  // For 2-axis joystick teleop:
  // X axis commands heading yaw rotation wz (CCW positive: left joy -> positive wz)
  const wz = -joyX * limits.WZ_MAX;

  // Lateral velocity vy (0 for basic forward/turn teleop)
  const vy = 0.0;

  return {
    vx: Number(clamp(vx, limits.VX_MIN, limits.VX_MAX).toFixed(3)),
    vy: Number(clamp(vy, limits.VY_MIN, limits.VY_MAX).toFixed(3)),
    wz: Number(clamp(wz, limits.WZ_MIN, limits.WZ_MAX).toFixed(3)),
  };
}

/**
 * Maps independent Twin-Stick gaming inputs to physical robot velocities:
 * - Left Stick Y (moveY): Forward / Reverse vx
 * - Left Stick X (moveX): Lateral Strafe vy
 * - Right Stick X (turnX): Yaw Angular Velocity wz
 * Optional speedMultiplier scales all linear and angular limits.
 */
export function mapTwinStickToVelocity(
  moveX: number,
  moveY: number,
  turnX: number,
  speedMultiplier: number = 1.0,
  limits = VELOCITY_LIMITS
): { vx: number; vy: number; wz: number } {
  const mult = clamp(speedMultiplier, 0.1, 2.0);

  let rawVx = 0;
  if (moveY >= 0) {
    rawVx = moveY * limits.VX_MAX * mult;
  } else {
    rawVx = -moveY * limits.VX_MIN * mult;
  }

  // Strafe: In MuJoCo/IsaacLab robot frame, +vy is Left and -vy is Right.
  // When user drags stick right (moveX > 0), command negative vy (right).
  // When user drags stick left (moveX < 0), command positive vy (left).
  const rawVy = -moveX * limits.VY_MAX * mult;

  // Yaw: In robot frame, +wz is CCW (turn left) and -wz is CW (turn right).
  // When user drags stick right (turnX > 0), command negative wz (turn right).
  // When user drags stick left (turnX < 0), command positive wz (turn left).
  const rawWz = -turnX * limits.WZ_MAX * mult;

  return {
    vx: Number(clamp(rawVx, limits.VX_MIN, limits.VX_MAX).toFixed(3)),
    vy: Number(clamp(rawVy, limits.VY_MIN, limits.VY_MAX).toFixed(3)),
    wz: Number(clamp(rawWz, limits.WZ_MIN, limits.WZ_MAX).toFixed(3)),
  };
}


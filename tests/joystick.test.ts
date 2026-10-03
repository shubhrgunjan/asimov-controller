import {
  clamp,
  applyDeadzone,
  normalizeJoystickInput,
  mapJoystickToVelocity,
  mapTwinStickToVelocity,
} from '../src/utils/math';
import { VELOCITY_LIMITS } from '../src/config';

describe('Joystick & Math Utilities', () => {
  describe('clamp', () => {
    it('clamps values within min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('applyDeadzone', () => {
    it('returns zero for inputs within deadzone', () => {
      expect(applyDeadzone(0.05, 0.1)).toBe(0.0);
      expect(applyDeadzone(-0.05, 0.1)).toBe(0.0);
    });

    it('scales linearly beyond deadzone', () => {
      expect(applyDeadzone(0.1, 0.1)).toBe(0.0);
      expect(applyDeadzone(1.0, 0.1)).toBeCloseTo(1.0, 4);
      expect(applyDeadzone(-1.0, 0.1)).toBeCloseTo(-1.0, 4);
      expect(applyDeadzone(0.55, 0.1)).toBeCloseTo(0.5, 2);
    });
  });

  describe('normalizeJoystickInput', () => {
    const radius = 50;

    it('returns zeroes when touch is at origin', () => {
      const res = normalizeJoystickInput(0, 0, radius, 0.1);
      expect(res.x).toBe(0);
      expect(res.y).toBe(0);
      expect(res.magnitude).toBe(0);
    });

    it('correctly maps pure upward touch (forward, positive Y)', () => {
      // Touch dy = -50 (upwards on screen)
      const res = normalizeJoystickInput(0, -50, radius, 0.0);
      expect(res.x).toBeCloseTo(0.0, 2);
      expect(res.y).toBeCloseTo(1.0, 2);
      expect(res.magnitude).toBeCloseTo(1.0, 2);
    });

    it('correctly maps pure downward touch (reverse, negative Y)', () => {
      // Touch dy = +50 (downwards on screen)
      const res = normalizeJoystickInput(0, 50, radius, 0.0);
      expect(res.x).toBeCloseTo(0.0, 2);
      expect(res.y).toBeCloseTo(-1.0, 2);
      expect(res.magnitude).toBeCloseTo(1.0, 2);
    });

    it('correctly maps pure right touch (positive X)', () => {
      const res = normalizeJoystickInput(50, 0, radius, 0.0);
      expect(res.x).toBeCloseTo(1.0, 2);
      expect(res.y).toBeCloseTo(0.0, 2);
    });

    it('clamps magnitude to 1.0 even if finger dragged past radius', () => {
      const res = normalizeJoystickInput(150, 0, radius, 0.0);
      expect(res.x).toBe(1.0);
      expect(res.magnitude).toBe(1.0);
    });
  });

  describe('mapJoystickToVelocity', () => {
    it('maps full forward joystick to VX_MAX', () => {
      const vel = mapJoystickToVelocity(0, 1.0);
      expect(vel.vx).toBe(VELOCITY_LIMITS.VX_MAX);
      expect(vel.wz).toBe(0.0);
    });

    it('maps full reverse joystick to VX_MIN', () => {
      const vel = mapJoystickToVelocity(0, -1.0);
      expect(vel.vx).toBe(VELOCITY_LIMITS.VX_MIN);
      expect(vel.wz).toBe(0.0);
    });

    it('maps left turn (negative joyX) to positive yaw CCW', () => {
      const vel = mapJoystickToVelocity(-1.0, 0);
      expect(vel.vx).toBe(0.0);
      expect(vel.wz).toBe(VELOCITY_LIMITS.WZ_MAX);
    });

    it('maps right turn (positive joyX) to negative yaw CW', () => {
      const vel = mapJoystickToVelocity(1.0, 0);
      expect(vel.vx).toBe(0.0);
      expect(vel.wz).toBe(VELOCITY_LIMITS.WZ_MIN);
    });

    it('returns zero velocities for neutral center joystick', () => {
      const vel = mapJoystickToVelocity(0, 0);
      expect(vel.vx).toBe(0.0);
      expect(vel.vy).toBe(0.0);
      expect(vel.wz).toBe(0.0);
    });
  });

  describe('mapTwinStickToVelocity', () => {
    it('maps left stick forward to positive vx and right stick turn to wz', () => {
      const vel = mapTwinStickToVelocity(0, 1.0, 1.0, 1.0);
      expect(vel.vx).toBe(VELOCITY_LIMITS.VX_MAX);
      expect(vel.vy).toBe(0.0);
      expect(vel.wz).toBe(VELOCITY_LIMITS.WZ_MIN);
    });

    it('maps left stick strafe to vy', () => {
      const vel = mapTwinStickToVelocity(1.0, 0.0, 0.0, 1.0);
      expect(vel.vx).toBe(0.0);
      expect(vel.vy).toBe(VELOCITY_LIMITS.VY_MAX);
      expect(vel.wz).toBe(0.0);
    });

    it('scales velocities according to speedMultiplier', () => {
      const vel = mapTwinStickToVelocity(0, 1.0, 0, 0.5);
      expect(vel.vx).toBeCloseTo(VELOCITY_LIMITS.VX_MAX * 0.5, 2);
    });
  });
});


import { TelemetryService } from '../src/services/telemetry/TelemetryService';
import { parseFaultFlags, formatPosition, formatOrientation } from '../src/utils/formatting';

describe('Telemetry Ingestion & Parsing', () => {
  it('provides safe baseline initial telemetry when disconnected', () => {
    const init = TelemetryService.getInitialTelemetry();
    expect(init.online).toBe(false);
    expect(init.mode).toBe('UNKNOWN');
    expect(init.base.position.z).toBe(0);
    expect(init.faults.reasons).toContain('DISCONNECTED');
  });

  it('correctly parses canonical simulation telemetry frame', () => {
    const mockFrame = {
      sequence: 1042,
      sim_time: 14.52,
      wall_time: 1727800000.5,
      edge_mode: 'MOVE',
      move_submode: 'WALK_POLICY',
      paused: false,
      base: {
        position: [0.35, -0.12, 0.615],
        orientation_quat: [0.999, 0.001, 0.02, 0.03],
        roll_deg: 2.1,
        pitch_deg: -1.4,
        yaw_deg: 45.8,
        linear_velocity_body: [0.42, 0.01, -0.05],
        angular_velocity_body: [0.0, 0.0, 0.25],
      },
      contacts: {
        left_foot: true,
        right_foot: false,
        active_contacts_count: 3,
      },
      faults: {
        latched: false,
        error_flags: 0,
        fall_detected: false,
        tilt_angle_deg: 3.5,
      },
      policy: {
        name: 'official_locomotion',
        step_count: 580,
        healthy: true,
      },
      environment: {
        preset: 'flat',
        ground_friction: 0.95,
        gantry_active: false,
      },
      battery: {
        soc_percent: 94.2,
        discharge_rate_w: 160.0,
        estimated_remaining_sec: 6800,
      },
    };

    const parsed = TelemetryService.parseFrame(mockFrame);

    expect(parsed.online).toBe(true);
    expect(parsed.simTime).toBe(14.52);
    expect(parsed.mode).toBe('MOVE');
    expect(parsed.submode).toBe('WALK_POLICY');

    // Base
    expect(parsed.base.position.x).toBe(0.35);
    expect(parsed.base.position.y).toBe(-0.12);
    expect(parsed.base.position.z).toBe(0.615);
    expect(parsed.base.orientation.yawDeg).toBe(45.8);
    expect(parsed.base.linearVelocityBody.x).toBe(0.42);

    // Contacts
    expect(parsed.contacts.leftFoot).toBe(true);
    expect(parsed.contacts.rightFoot).toBe(false);
    expect(parsed.contacts.activeContactsCount).toBe(3);

    // Safety & Battery
    expect(parsed.faults.latched).toBe(false);
    expect(parsed.faults.reasons).toEqual(['NOMINAL']);
    expect(parsed.battery.socPercent).toBe(94.2);
    expect(parsed.rawFrameSequence).toBe(1042);
  });

  it('handles sparse / missing fields gracefully without crashing', () => {
    const sparseFrame = {
      sim_time: 1.2,
    };

    const parsed = TelemetryService.parseFrame(sparseFrame);
    expect(parsed.online).toBe(true);
    expect(parsed.simTime).toBe(1.2);
    expect(parsed.mode).toBe('UNKNOWN');
    expect(parsed.base.position.z).toBe(0);
    expect(parsed.contacts.leftFoot).toBe(false);
    expect(parsed.faults.latched).toBe(false);
  });

  describe('parseFaultFlags', () => {
    it('returns NOMINAL when flags are 0', () => {
      expect(parseFaultFlags(0)).toEqual(['NOMINAL']);
    });

    it('decodes individual bitmask flags', () => {
      expect(parseFaultFlags(0x01)).toContain('FALL_DETECTED');
      expect(parseFaultFlags(0x04)).toContain('MOTOR_OVERTEMP');
      expect(parseFaultFlags(0x08)).toContain('CAN_BUS_COMM_ERROR');
    });

    it('decodes composite error flags', () => {
      const flags = 0x01 | 0x04; // Fall + Overtemp
      const res = parseFaultFlags(flags);
      expect(res).toContain('FALL_DETECTED');
      expect(res).toContain('MOTOR_OVERTEMP');
    });
  });

  describe('Formatting Utilities', () => {
    it('formats position with meters', () => {
      expect(formatPosition(1.234, -0.567, 0.891)).toBe('X: 1.23m  Y: -0.57m  Z: 0.89m');
    });

    it('formats angles with degree symbols', () => {
      expect(formatOrientation(1.5, -2.4, 45.0)).toBe('R: 1.5°  P: -2.4°  Y: 45.0°');
    });
  });
});

/**
 * Asimov Controller - Telemetry Parsing & Processing Service
 * Converts raw simulation gateway frames into structured typed telemetry models.
 */

import {
  RobotTelemetry,
  RobotMode,
  MoveSubmode,
  BaseTelemetry,
  ContactTelemetry,
  FaultTelemetry,
  PolicyTelemetry,
  EnvironmentTelemetry,
  BatteryTelemetry,
} from '../../types/telemetry';
import { parseFaultFlags } from '../../utils/formatting';

export class TelemetryService {
  /**
   * Generates a safe baseline/default telemetry snapshot when the simulator is offline.
   */
  public static getInitialTelemetry(): RobotTelemetry {
    return {
      timestamp: Date.now(),
      simTime: 0.0,
      wallTime: Date.now() / 1000,
      online: false,
      paused: false,
      mode: 'UNKNOWN',
      submode: 'NONE',
      base: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { rollDeg: 0, pitchDeg: 0, yawDeg: 0 },
        orientationQuat: [1, 0, 0, 0],
        linearVelocityBody: { x: 0, y: 0, z: 0 },
        angularVelocityBody: { x: 0, y: 0, z: 0 },
      },
      contacts: {
        leftFoot: false,
        rightFoot: false,
        activeContactsCount: 0,
      },
      faults: {
        latched: false,
        errorFlags: 0,
        fallDetected: false,
        tiltAngleDeg: 0,
        reasons: ['DISCONNECTED'],
      },
      policy: {
        name: 'none',
        stepCount: 0,
        healthy: false,
      },
      environment: {
        preset: 'flat',
        groundFriction: 1.0,
        gantryActive: false,
      },
      battery: {
        socPercent: 100.0,
        dischargeRateW: 0.0,
        estimatedRemainingSec: 0,
      },
      rawFrameSequence: 0,
    };
  }

  /**
   * Safely transforms a raw frame object received over WebSocket or REST into RobotTelemetry.
   */
  public static parseFrame(raw: Record<string, unknown>): RobotTelemetry {
    const rawBase = (raw.base as Record<string, any>) || {};
    const rawContacts = (raw.contacts as Record<string, any>) || {};
    const rawFaults = (raw.faults as Record<string, any>) || {};
    const rawPolicy = (raw.policy as Record<string, any>) || {};
    const rawEnv = (raw.environment as Record<string, any>) || {};
    const rawBatt = (raw.battery as Record<string, any>) || {};

    // 1. Base translation & kinematics
    const posArr = Array.isArray(rawBase.position) ? rawBase.position : [0, 0, 0];
    const quatArr = Array.isArray(rawBase.orientation_quat) ? rawBase.orientation_quat : [1, 0, 0, 0];
    const linVel = Array.isArray(rawBase.linear_velocity_body) ? rawBase.linear_velocity_body : [0, 0, 0];
    const angVel = Array.isArray(rawBase.angular_velocity_body) ? rawBase.angular_velocity_body : [0, 0, 0];

    const base: BaseTelemetry = {
      position: {
        x: Number(posArr[0] ?? 0),
        y: Number(posArr[1] ?? 0),
        z: Number(posArr[2] ?? 0),
      },
      orientation: {
        rollDeg: Number(rawBase.roll_deg ?? 0),
        pitchDeg: Number(rawBase.pitch_deg ?? 0),
        yawDeg: Number(rawBase.yaw_deg ?? 0),
      },
      orientationQuat: [
        Number(quatArr[0] ?? 1),
        Number(quatArr[1] ?? 0),
        Number(quatArr[2] ?? 0),
        Number(quatArr[3] ?? 0),
      ],
      linearVelocityBody: {
        x: Number(linVel[0] ?? 0),
        y: Number(linVel[1] ?? 0),
        z: Number(linVel[2] ?? 0),
      },
      angularVelocityBody: {
        x: Number(angVel[0] ?? 0),
        y: Number(angVel[1] ?? 0),
        z: Number(angVel[2] ?? 0),
      },
    };

    // 2. Foot contacts
    const contacts: ContactTelemetry = {
      leftFoot: Boolean(rawContacts.left_foot),
      rightFoot: Boolean(rawContacts.right_foot),
      activeContactsCount: Number(rawContacts.active_contacts_count ?? 0),
    };

    // 3. Fault & Safety state
    const errorFlags = Number(rawFaults.error_flags ?? 0);
    const faults: FaultTelemetry = {
      latched: Boolean(rawFaults.latched),
      errorFlags,
      fallDetected: Boolean(rawFaults.fall_detected),
      tiltAngleDeg: Number(rawFaults.tilt_angle_deg ?? 0),
      reasons: parseFaultFlags(errorFlags),
    };

    // 4. Policy info
    const policy: PolicyTelemetry = {
      name: String(rawPolicy.name || 'none'),
      stepCount: Number(rawPolicy.step_count ?? 0),
      healthy: Boolean(rawPolicy.healthy ?? true),
    };

    // 5. Environment & Gantry
    const environment: EnvironmentTelemetry = {
      preset: String(rawEnv.preset || 'flat'),
      groundFriction: Number(rawEnv.ground_friction ?? 1.0),
      gantryActive: Boolean(rawEnv.gantry_active),
    };

    // 6. Battery state
    const battery: BatteryTelemetry = {
      socPercent: Number(rawBatt.soc_percent ?? 100.0),
      dischargeRateW: Number(rawBatt.discharge_rate_w ?? 0.0),
      estimatedRemainingSec: Number(rawBatt.estimated_remaining_sec ?? 0),
    };

    // 7. Modes
    const rawMode = String(raw.edge_mode || raw.control_mode || 'UNKNOWN').toUpperCase();
    const mode: RobotMode = ['DAMP', 'SETTLE', 'STAND', 'MOVE', 'FAULT', 'ESTOP'].includes(rawMode)
      ? (rawMode as RobotMode)
      : 'UNKNOWN';

    const rawSubmode = String(raw.move_submode || 'NONE').toUpperCase();
    const submode: MoveSubmode = [
      'NONE',
      'STAND_HOLD',
      'TRAJECTORY',
      'WALK_POLICY',
      'RECOVERY',
      'SAFE_FALL',
    ].includes(rawSubmode)
      ? (rawSubmode as MoveSubmode)
      : 'NONE';

    return {
      timestamp: Date.now(),
      simTime: Number(raw.sim_time ?? 0),
      wallTime: Number(raw.wall_time ?? Date.now() / 1000),
      online: true,
      paused: Boolean(raw.paused),
      mode,
      submode,
      base,
      contacts,
      faults,
      policy,
      environment,
      battery,
      rawFrameSequence: Number(raw.sequence ?? 0),
    };
  }
}

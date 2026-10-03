/**
 * Asimov Controller - Telemetry Data Contracts
 * Defines the structured telemetry model ingested from the Virtual Asimov gateway.
 */

export type RobotMode =
  | 'DAMP'
  | 'SETTLE'
  | 'STAND'
  | 'MOVE'
  | 'FAULT'
  | 'ESTOP'
  | 'UNKNOWN';

export type MoveSubmode =
  | 'NONE'
  | 'STAND_HOLD'
  | 'TRAJECTORY'
  | 'WALK_POLICY'
  | 'RECOVERY'
  | 'SAFE_FALL';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface OrientationEuler {
  rollDeg: number;
  pitchDeg: number;
  yawDeg: number;
}

export interface BaseTelemetry {
  position: Vector3D;
  orientation: OrientationEuler;
  orientationQuat: [number, number, number, number]; // [w, x, y, z]
  linearVelocityBody: Vector3D;
  angularVelocityBody: Vector3D;
}

export interface ContactTelemetry {
  leftFoot: boolean;
  rightFoot: boolean;
  activeContactsCount: number;
}

export interface FaultTelemetry {
  latched: boolean;
  errorFlags: number;
  fallDetected: boolean;
  tiltAngleDeg: number;
  reasons: string[];
}

export interface PolicyTelemetry {
  name: string;
  stepCount: number;
  healthy: boolean;
}

export interface EnvironmentTelemetry {
  preset: string;
  groundFriction: number;
  gantryActive: boolean;
}

export interface BatteryTelemetry {
  socPercent: number;
  dischargeRateW: number;
  estimatedRemainingSec: number;
}

/**
 * Top-level canonical robot telemetry state used across the mobile application.
 */
export interface RobotTelemetry {
  timestamp: number;
  simTime: number;
  wallTime: number;
  online: boolean;
  paused: boolean;
  mode: RobotMode;
  submode: MoveSubmode;
  base: BaseTelemetry;
  contacts: ContactTelemetry;
  faults: FaultTelemetry;
  policy: PolicyTelemetry;
  environment: EnvironmentTelemetry;
  battery: BatteryTelemetry;
  rawFrameSequence: number;
}

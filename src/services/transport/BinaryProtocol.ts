/**
 * Asimov Controller - Binary Wire Protocol
 * Compact binary serialization for low-latency WebRTC data channels.
 * Matches vasimov/web/server/webrtc_gateway.py byte-for-byte.
 */

import { RobotTelemetry } from '../../types/telemetry';

export const CTRL_MAGIC = 0x4c544341; // 'ACTL' in little-endian uint32
export const TELEM_MAGIC = 0x4c455441; // 'ATEL' in little-endian uint32

export const ACTION_CODES: Record<string, number> = {
  idle: 0,
  stand: 1,
  damp: 2,
  stop: 3,
  walk: 4,
  fall: 5,
  getup: 6,
  reset: 7,
  switch_cam: 8,
};

export const MODE_NAMES: Record<number, any> = {
  0: 'UNKNOWN',
  1: 'DAMP',
  2: 'STAND',
  3: 'MOVE',
  4: 'FAULT',
  5: 'ESTOP',
};

export const SUBMODE_NAMES: Record<number, any> = {
  0: 'NONE',
  1: 'WALK_POLICY',
  2: 'TRAJECTORY',
  3: 'MANUAL',
};

export class BinaryProtocol {
  /**
   * Packs a 32-byte binary control packet for continuous joystick / action commands.
   * Supports either separate numeric arguments or a params object.
   */
  public static packControl(
    seq: number,
    action: string,
    vxOrParams: number | Record<string, unknown> = 0.0,
    vyArg: number = 0.0,
    wzArg: number = 0.0,
    buttonsArg: number = 0,
    camIdxArg: number = 0,
    tsUs?: number
  ): Uint8Array {
    let vx = 0.0;
    let vy = 0.0;
    let wz = 0.0;
    let buttons = 0;
    let camIdx = 0;

    if (typeof vxOrParams === 'object' && vxOrParams !== null) {
      vx = Number(vxOrParams.vx ?? 0.0);
      vy = Number(vxOrParams.vy ?? 0.0);
      wz = Number(vxOrParams.wz ?? 0.0);
      buttons = Number(vxOrParams.buttons ?? 0);
      camIdx = Number(vxOrParams.camera_index ?? 0);
    } else {
      vx = Number(vxOrParams ?? 0.0);
      vy = Number(vyArg ?? 0.0);
      wz = Number(wzArg ?? 0.0);
      buttons = Number(buttonsArg ?? 0);
      camIdx = Number(camIdxArg ?? 0);
    }

    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);

    // Header: 'ACTL'
    view.setUint8(0, 0x41); // A
    view.setUint8(1, 0x43); // C
    view.setUint8(2, 0x54); // T
    view.setUint8(3, 0x4c); // L

    view.setUint32(4, seq, true);

    const clientTsUs = tsUs !== undefined ? BigInt(tsUs) : BigInt(Date.now()) * 1000n;
    view.setBigUint64(8, clientTsUs, true);

    const actionCode = ACTION_CODES[action.toLowerCase()] ?? 0;
    view.setUint8(16, actionCode);

    view.setFloat32(17, vx, true);
    view.setFloat32(21, vy, true);
    view.setFloat32(25, wz, true);

    view.setUint16(29, buttons, true);
    view.setUint8(31, camIdx);

    return new Uint8Array(buffer);
  }

  /**
   * Unpacks an 85-byte binary telemetry packet received over WebRTC data channel or WebSocket.
   */
  public static unpackTelemetry(
    data: ArrayBuffer | Uint8Array
  ): { telemetry: RobotTelemetry; pingEchoUs: number } | null {
    const buf = data instanceof Uint8Array ? data.buffer : data;
    if (buf.byteLength < 85) {
      return null;
    }

    const byteOffset = data instanceof Uint8Array ? data.byteOffset : 0;
    const view = new DataView(buf, byteOffset, 85);

    // Verify 'ATEL' magic
    const m0 = view.getUint8(0);
    const m1 = view.getUint8(1);
    const m2 = view.getUint8(2);
    const m3 = view.getUint8(3);
    if (m0 !== 0x41 || m1 !== 0x54 || m2 !== 0x45 || m3 !== 0x4c) {
      return null;
    }

    const seq = view.getUint32(4, true);
    const simTime = view.getFloat32(8, true);
    const wallTimeMs = view.getFloat64(12, true);

    const modeCode = view.getUint8(20);
    const submodeCode = view.getUint8(21);

    const posX = view.getFloat32(22, true);
    const posY = view.getFloat32(26, true);
    const posZ = view.getFloat32(30, true);

    const quatW = view.getFloat32(34, true);
    const quatX = view.getFloat32(38, true);
    const quatY = view.getFloat32(42, true);
    const quatZ = view.getFloat32(46, true);

    const velX = view.getFloat32(50, true);
    const velY = view.getFloat32(54, true);
    const velZ = view.getFloat32(58, true);

    const angX = view.getFloat32(62, true);
    const angY = view.getFloat32(66, true);
    const angZ = view.getFloat32(70, true);

    const contactsMask = view.getUint8(74);
    const leftFoot = (contactsMask & 1) !== 0;
    const rightFoot = (contactsMask & 2) !== 0;

    const faultMask = view.getUint8(75);
    const faultLatched = (faultMask & 1) !== 0;
    const fallDetected = (faultMask & 2) !== 0;

    const batterySoc = view.getUint8(76);
    const pingEchoUs = Number(view.getBigUint64(77, true));

    const mode = (MODE_NAMES[modeCode] || 'UNKNOWN') as any;
    const submode = (SUBMODE_NAMES[submodeCode] || 'NONE') as any;

    const telemetry: RobotTelemetry = {
      timestamp: wallTimeMs / 1000.0,
      simTime,
      wallTime: wallTimeMs / 1000.0,
      online: true,
      paused: false,
      mode,
      submode,
      base: {
        position: { x: posX, y: posY, z: posZ },
        orientation: { rollDeg: 0, pitchDeg: 0, yawDeg: 0 },
        orientationQuat: [quatW, quatX, quatY, quatZ],
        linearVelocityBody: { x: velX, y: velY, z: velZ },
        angularVelocityBody: { x: angX, y: angY, z: angZ },
      },
      contacts: {
        leftFoot,
        rightFoot,
        activeContactsCount: (leftFoot ? 1 : 0) + (rightFoot ? 1 : 0),
      },
      faults: {
        latched: faultLatched,
        errorFlags: faultLatched ? 1 : 0,
        fallDetected,
        tiltAngleDeg: 0,
        reasons: [],
      },
      policy: {
        name: 'official_locomotion',
        stepCount: seq,
        healthy: true,
      },
      environment: {
        preset: 'flat',
        groundFriction: 1.0,
        gantryActive: false,
      },
      battery: {
        socPercent: batterySoc,
        dischargeRateW: 45.0,
        estimatedRemainingSec: Math.round((batterySoc / 100) * 3600),
      },
      rawFrameSequence: seq,
    };

    return { telemetry, pingEchoUs };
  }
}

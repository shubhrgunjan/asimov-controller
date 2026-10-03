/**
 * Asimov Controller - Formatting Utilities
 */

export function formatVelocity(vx: number, vy: number, wz: number): string {
  return `vx: ${vx >= 0 ? '+' : ''}${vx.toFixed(2)} vy: ${vy >= 0 ? '+' : ''}${vy.toFixed(2)} wz: ${wz >= 0 ? '+' : ''}${wz.toFixed(2)}`;
}

export function formatPosition(x: number, y: number, z: number): string {
  return `X: ${x.toFixed(2)}m  Y: ${y.toFixed(2)}m  Z: ${z.toFixed(2)}m`;
}

export function formatOrientation(roll: number, pitch: number, yaw: number): string {
  return `R: ${roll.toFixed(1)}°  P: ${pitch.toFixed(1)}°  Y: ${yaw.toFixed(1)}°`;
}

export function formatSimTime(simTimeSec: number): string {
  const mins = Math.floor(simTimeSec / 60);
  const secs = (simTimeSec % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}s`;
}

export function parseFaultFlags(flags: number): string[] {
  const faults: string[] = [];
  if (flags === 0) return ['NOMINAL'];
  if (flags & 0x01) faults.push('FALL_DETECTED');
  if (flags & 0x02) faults.push('JOINT_LIMIT_EXCEEDED');
  if (flags & 0x04) faults.push('MOTOR_OVERTEMP');
  if (flags & 0x08) faults.push('CAN_BUS_COMM_ERROR');
  if (flags & 0x10) faults.push('WATCHDOG_TIMEOUT');
  if (flags & 0x20) faults.push('TORQUE_SATURATION');
  return faults.length > 0 ? faults : [`UNKNOWN_0x${flags.toString(16)}`];
}

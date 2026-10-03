/**
 * Asimov Controller - Control Command Contracts & Acknowledgements
 */

export type ControllerAction =
  | 'stand'
  | 'damp'
  | 'stop'
  | 'walk'
  | 'fall'
  | 'safefall'
  | 'getup'
  | 'recover'
  | 'reset'
  | 'pause'
  | 'resume';

export interface WalkCommandParams {
  vx: number;  // Forward (+) / Backward (-), [-0.5, 1.0] m/s
  vy: number;  // Lateral left (+) / right (-), [-0.3, 0.3] m/s
  wz: number;  // Heading yaw CCW (+) / CW (-), [-0.8, 0.8] rad/s
}

export interface ResetCommandParams {
  seed?: number;
}

export type CommandParams = WalkCommandParams | ResetCommandParams | Record<string, unknown>;

export interface CommandMessage {
  action: ControllerAction | string;
  params?: CommandParams;
  clientTimestamp?: number;
}

export interface CommandLifecycle {
  userInput: string;
  parsed?: Record<string, unknown>;
  validation: string;
  clipped?: boolean;
  reason?: string;
  applied?: string;
  simulatorResult?: string;
}

export interface CommandAck {
  commandId: number;
  action: string;
  timestamp: number;
  simTime: number;
  status: 'accepted' | 'rejected' | 'pending' | 'error';
  lifecycle?: CommandLifecycle;
  message?: string;
}

export interface RobotControllerInterface {
  connect(host: string, httpPort: number, wsPort: number): Promise<void>;
  disconnect(): Promise<void>;
  stand(): Promise<CommandAck>;
  damp(): Promise<CommandAck>;
  stop(): Promise<CommandAck>;
  walk(vx: number, vy: number, wz: number): Promise<CommandAck>;
  fall(): Promise<CommandAck>;
  getup(): Promise<CommandAck>;
  reset(seed?: number): Promise<CommandAck>;
}

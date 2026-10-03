/**
 * Asimov Controller - Connection Types
 */

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface ConnectionConfig {
  host: string;
  httpPort: number;
  wsPort: number;
  autoReconnect: boolean;
  reconnectIntervalMs: number;
  heartbeatIntervalMs: number;
  telemetryTimeoutMs: number;
}

export interface ConnectionStats {
  state: ConnectionState;
  host: string;
  httpPort: number;
  wsPort: number;
  latencyMs: number;
  lastMessageTime: number | null;
  reconnectAttempts: number;
  lastError: string | null;
}

export type TransportMode = 'WEBRTC' | 'LEGACY';
export type LatencyMode = 'LOW_LATENCY' | 'BALANCED' | 'QUALITY';

export interface WebRTCStats {
  fps: number;
  bitrateKbps: number;
  rttMs: number;
  packetLoss: number;
  jitterMs: number;
  width: number;
  height: number;
  droppedFrames: number;
  mode: LatencyMode;
}

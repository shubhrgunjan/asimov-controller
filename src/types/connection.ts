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

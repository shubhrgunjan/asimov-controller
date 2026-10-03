/**
 * Asimov Controller - WebSocket Streaming Transport Client
 * Manages the high-rate (~25 Hz) telemetry stream from the Virtual Asimov gateway.
 */

import { ConnectionState } from '../../types/connection';
import { CommandAck } from '../../types/controller';
import { RobotTelemetry } from '../../types/telemetry';
import { BinaryProtocol } from './BinaryProtocol';

export type FrameListener = (rawFrame: Record<string, unknown>) => void;
export type StatusListener = (state: ConnectionState, message?: string) => void;
export type AckListener = (ack: CommandAck) => void;
export type BinaryTelemetryListener = (telemetry: RobotTelemetry) => void;

export class WebSocketClient {
  private host: string;
  private port: number;
  private autoReconnect: boolean;
  private reconnectIntervalMs: number;

  private ws: WebSocket | null = null;
  private state: ConnectionState = 'DISCONNECTED';
  private reconnectTimer: any = null;
  private isIntentionallyClosed: boolean = false;

  private frameListeners: Set<FrameListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private ackListeners: Set<AckListener> = new Set();
  private binaryTelemetryListeners: Set<BinaryTelemetryListener> = new Set();

  constructor(
    host: string = '10.0.2.2',
    port: number = 8854,
    autoReconnect: boolean = true,
    reconnectIntervalMs: number = 2000
  ) {
    this.host = host;
    this.port = port;
    this.autoReconnect = autoReconnect;
    this.reconnectIntervalMs = reconnectIntervalMs;
  }

  public updateEndpoint(host: string, port: number): void {
    const changed = this.host !== host || this.port !== port;
    this.host = host;
    this.port = port;
    if (changed && this.isConnected()) {
      this.disconnect();
      this.connect();
    }
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'CONNECTED' && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.setState('CONNECTING');

    const url = `ws://${this.host}:${this.port}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.clearReconnectTimer();
        this.setState('CONNECTED');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            const u8 = new Uint8Array(event.data);
            const unpacked = BinaryProtocol.unpackTelemetry(u8);
            if (unpacked) {
              this.notifyBinaryTelemetry(unpacked.telemetry);
              return;
            }
          }

          const data = JSON.parse(event.data as string);
          if (data.type === 'ack' && data.ack) {
            this.notifyAck(data.ack);
          } else {
            this.notifyFrame(data);
          }
        } catch {
          // Ignore malformed packet
        }
      };

      this.ws.onerror = () => {
        if (!this.isIntentionallyClosed) {
          this.setState('ERROR', 'WebSocket error encountered');
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.isIntentionallyClosed) {
          this.setState('DISCONNECTED', 'Connection closed');
          if (this.autoReconnect) {
            this.scheduleReconnect();
          }
        } else {
          this.setState('DISCONNECTED');
        }
      };
    } catch (err: any) {
      this.setState('ERROR', err.message || 'Failed to initialize WebSocket');
      if (this.autoReconnect && !this.isIntentionallyClosed) {
        this.scheduleReconnect();
      }
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimer();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Safe ignore
      }
      this.ws = null;
    }
    this.setState('DISCONNECTED');
  }

  public sendCommand(action: string, params: Record<string, unknown> = {}): boolean {
    if (!this.isConnected() || !this.ws) {
      return false;
    }

    try {
      const payload = JSON.stringify({ action, params });
      this.ws.send(payload);
      return true;
    } catch {
      return false;
    }
  }

  public sendBinary(data: Uint8Array): boolean {
    if (!this.isConnected() || !this.ws) {
      return false;
    }

    try {
      this.ws.send(data.buffer as ArrayBuffer);
      return true;
    } catch {
      return false;
    }
  }

  public onFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  public onBinaryTelemetry(listener: BinaryTelemetryListener): () => void {
    this.binaryTelemetryListeners.add(listener);
    return () => this.binaryTelemetryListeners.delete(listener);
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public onAck(listener: AckListener): () => void {
    this.ackListeners.add(listener);
    return () => this.ackListeners.delete(listener);
  }

  private notifyBinaryTelemetry(telemetry: RobotTelemetry): void {
    for (const listener of this.binaryTelemetryListeners) {
      try {
        listener(telemetry);
      } catch {
        // Protect loop
      }
    }
  }

  private setState(newState: ConnectionState, message?: string): void {
    this.state = newState;
    for (const listener of this.statusListeners) {
      try {
        listener(newState, message);
      } catch {
        // Protect loop
      }
    }
  }

  private notifyFrame(frame: Record<string, unknown>): void {
    for (const listener of this.frameListeners) {
      try {
        listener(frame);
      } catch {
        // Protect loop
      }
    }
  }

  private notifyAck(rawAck: Record<string, unknown>): void {
    const ack: CommandAck = {
      commandId: Number(rawAck.command_id) || 0,
      action: String(rawAck.action || ''),
      timestamp: Number(rawAck.timestamp) || Date.now() / 1000,
      simTime: Number(rawAck.sim_time) || 0,
      status: (rawAck.status as any) || 'accepted',
      lifecycle: rawAck.lifecycle as any,
    };

    for (const listener of this.ackListeners) {
      try {
        listener(ack);
      } catch {
        // Protect loop
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isIntentionallyClosed) return;
    this.setState('RECONNECTING');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionallyClosed) {
        this.connect();
      }
    }, this.reconnectIntervalMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

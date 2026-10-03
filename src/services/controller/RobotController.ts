/**
 * Asimov Controller - Robot Controller Service
 * Orchestrates communication with Virtual Asimov, command throttling, and joystick control loops.
 */

import { RestClient } from '../transport/RestClient';
import { WebSocketClient } from '../transport/WebSocketClient';
import { CameraService } from '../camera/CameraService';
import { CommandAck, RobotControllerInterface } from '../../types/controller';
import { TIMING_CONFIG } from '../../config';

export class RobotController implements RobotControllerInterface {
  public restClient: RestClient;
  public wsClient: WebSocketClient;
  public cameraService: CameraService;

  private targetVx: number = 0.0;
  private targetVy: number = 0.0;
  private targetWz: number = 0.0;

  private lastSentVx: number = 0.0;
  private lastSentVy: number = 0.0;
  private lastSentWz: number = 0.0;

  private commandLoopTimer: any = null;
  private isZeroSent: boolean = true;
  private lastAck: CommandAck | null = null;
  private ackListeners: Set<(ack: CommandAck) => void> = new Set();

  constructor(host: string = '10.0.2.2', httpPort: number = 8852, wsPort: number = 8854) {
    this.restClient = new RestClient(host, httpPort);
    this.wsClient = new WebSocketClient(host, wsPort);
    this.cameraService = new CameraService(this.restClient, 'THIRD');

    // Subscribe to WS acknowledgements
    this.wsClient.onAck((ack) => {
      this.handleAck(ack);
    });
  }

  public async connect(host: string, httpPort: number, wsPort: number): Promise<void> {
    this.restClient.updateEndpoint(host, httpPort);
    this.wsClient.updateEndpoint(host, wsPort);
    this.wsClient.connect();
    this.startCommandLoop();
  }

  public async disconnect(): Promise<void> {
    this.stopCommandLoop();
    this.targetVx = 0.0;
    this.targetVy = 0.0;
    this.targetWz = 0.0;
    this.wsClient.disconnect();
  }

  // ── High-Level Robot Actions ───────────────────────────────────────────────

  public async stand(): Promise<CommandAck> {
    this.zeroTargetVelocity();
    return this.dispatchCommand('stand');
  }

  public async damp(): Promise<CommandAck> {
    this.zeroTargetVelocity();
    return this.dispatchCommand('damp');
  }

  public async stop(): Promise<CommandAck> {
    this.zeroTargetVelocity();
    return this.dispatchCommand('stop');
  }

  public async walk(vx: number, vy: number, wz: number): Promise<CommandAck> {
    return this.dispatchCommand('walk', { vx, vy, wz });
  }

  public async fall(): Promise<CommandAck> {
    this.zeroTargetVelocity();
    return this.dispatchCommand('fall');
  }

  public async getup(): Promise<CommandAck> {
    this.zeroTargetVelocity();
    return this.dispatchCommand('getup');
  }

  public async reset(seed: number = 42): Promise<CommandAck> {
    this.zeroTargetVelocity();
    return this.dispatchCommand('reset', { seed });
  }

  // ── Throttled Joystick Control Loop ────────────────────────────────────────

  /**
   * Sets the commanded velocity from the virtual joystick.
   * Does NOT fire immediate network request; buffered for the 20 Hz command loop.
   */
  public setTargetVelocity(vx: number, vy: number, wz: number): void {
    this.targetVx = vx;
    this.targetVy = vy;
    this.targetWz = wz;

    if (vx !== 0 || vy !== 0 || wz !== 0) {
      this.isZeroSent = false;
    }
  }

  public getTargetVelocity(): { vx: number; vy: number; wz: number } {
    return { vx: this.targetVx, vy: this.targetVy, wz: this.targetWz };
  }

  public onAck(listener: (ack: CommandAck) => void): () => void {
    this.ackListeners.add(listener);
    return () => this.ackListeners.delete(listener);
  }

  public getLastAck(): CommandAck | null {
    return this.lastAck;
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  private zeroTargetVelocity(): void {
    this.targetVx = 0.0;
    this.targetVy = 0.0;
    this.targetWz = 0.0;
  }

  private startCommandLoop(): void {
    if (this.commandLoopTimer) return;

    this.commandLoopTimer = setInterval(() => {
      this.tickCommandLoop();
    }, TIMING_CONFIG.JOYSTICK_DISPATCH_INTERVAL_MS);
  }

  private stopCommandLoop(): void {
    if (this.commandLoopTimer) {
      clearInterval(this.commandLoopTimer);
      this.commandLoopTimer = null;
    }
  }

  private tickCommandLoop(): void {
    const isTargetZero = this.targetVx === 0 && this.targetVy === 0 && this.targetWz === 0;

    // If zero and zero has already been transmitted once, don't spam network
    if (isTargetZero && this.isZeroSent) {
      return;
    }

    const hasChanged =
      Math.abs(this.targetVx - this.lastSentVx) > 0.01 ||
      Math.abs(this.targetVy - this.lastSentVy) > 0.01 ||
      Math.abs(this.targetWz - this.lastSentWz) > 0.01;

    // If target is moving, or just stopped, transmit
    if (hasChanged || !isTargetZero) {
      this.lastSentVx = this.targetVx;
      this.lastSentVy = this.targetVy;
      this.lastSentWz = this.targetWz;

      if (isTargetZero) {
        this.isZeroSent = true;
        this.dispatchCommand('stop');
      } else {
        this.dispatchCommand('walk', {
          vx: this.targetVx,
          vy: this.targetVy,
          wz: this.targetWz,
        });
      }
    }
  }

  private async dispatchCommand(action: string, params: Record<string, unknown> = {}): Promise<CommandAck> {
    // If WebSocket is actively connected, send over fast channel
    if (this.wsClient.isConnected()) {
      const sent = this.wsClient.sendCommand(action, params);
      if (sent) {
        return {
          commandId: 0,
          action,
          timestamp: Date.now() / 1000,
          simTime: 0,
          status: 'pending',
        };
      }
    }

    // Fallback to HTTP REST
    const ack = await this.restClient.sendCommand(action, params);
    this.handleAck(ack);
    return ack;
  }

  private handleAck(ack: CommandAck): void {
    this.lastAck = ack;
    for (const listener of this.ackListeners) {
      try {
        listener(ack);
      } catch {
        // Protect loop
      }
    }
  }
}

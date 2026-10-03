/**
 * Asimov Controller - REST Transport Client
 * Communicates with the Virtual Asimov HTTP Gateway (/api/*).
 */

import { CommandAck } from '../../types/controller';

export class RestClient {
  private host: string;
  private port: number;
  private timeoutMs: number;

  constructor(host: string = '10.0.2.2', port: number = 8852, timeoutMs: number = 3000) {
    this.host = host;
    this.port = port;
    this.timeoutMs = timeoutMs;
  }

  public updateEndpoint(host: string, port: number): void {
    this.host = host;
    this.port = port;
  }

  public getBaseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  public getCameraFrameUrl(simCameraName: string, cacheBuster: number = 0): string {
    return `${this.getBaseUrl()}/api/camera/frame?camera=${encodeURIComponent(simCameraName)}&t=${cacheBuster}`;
  }

  public getCameraStreamUrl(simCameraName: string): string {
    return `${this.getBaseUrl()}/api/camera/stream?camera=${encodeURIComponent(simCameraName)}`;
  }

  public async fetchState(): Promise<Record<string, unknown>> {
    const url = `${this.getBaseUrl()}/api/state`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) {
        throw new Error(`HTTP error ${resp.status}: ${resp.statusText}`);
      }
      return await resp.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public async sendCommand(
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<CommandAck> {
    const url = `${this.getBaseUrl()}/api/control`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const body = JSON.stringify({ action, params });

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });

      if (!resp.ok) {
        return {
          commandId: 0,
          action,
          timestamp: Date.now() / 1000,
          simTime: 0,
          status: 'error',
          message: `HTTP ${resp.status}: ${resp.statusText}`,
        };
      }

      const json = await resp.json();
      return {
        commandId: json.command_id || 0,
        action: json.action || action,
        timestamp: json.timestamp || Date.now() / 1000,
        simTime: json.sim_time || 0,
        status: json.status || 'accepted',
        lifecycle: json.lifecycle,
        message: json.message,
      };
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      return {
        commandId: 0,
        action,
        timestamp: Date.now() / 1000,
        simTime: 0,
        status: 'error',
        message: isAbort ? `Command timed out after ${this.timeoutMs}ms` : err.message || 'Network error',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Asimov Controller - Camera Service
 * Manages camera viewpoints and resolves simulator camera URLs.
 */

import {
  CameraMode,
  SimulatorCamera,
  CAMERA_DEFINITIONS,
  CameraDefinition,
} from '../../types/camera';
import { RestClient } from '../transport/RestClient';

export class CameraService {
  private currentMode: CameraMode = 'THIRD'; // Default to 3rd person chase view
  private restClient: RestClient;
  private listeners: Set<(mode: CameraMode, def: CameraDefinition) => void> = new Set();

  constructor(restClient: RestClient, initialMode: CameraMode = 'THIRD') {
    this.restClient = restClient;
    this.currentMode = initialMode;
  }

  public getMode(): CameraMode {
    return this.currentMode;
  }

  public getDefinition(): CameraDefinition {
    return CAMERA_DEFINITIONS[this.currentMode];
  }

  public getSimCameraName(): SimulatorCamera {
    return CAMERA_DEFINITIONS[this.currentMode].simCameraName;
  }

  public setMode(mode: CameraMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    const def = CAMERA_DEFINITIONS[mode];
    for (const listener of this.listeners) {
      try {
        listener(mode, def);
      } catch {
        // Protect loop
      }
    }
  }

  public getSnapshotUrl(cacheBuster: number = 0): string {
    const simCam = this.getSimCameraName();
    return this.restClient.getCameraFrameUrl(simCam, cacheBuster);
  }

  public getStreamUrl(): string {
    const simCam = this.getSimCameraName();
    return this.restClient.getCameraStreamUrl(simCam);
  }

  public onCameraChange(listener: (mode: CameraMode, def: CameraDefinition) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Asimov Controller - Central Robot State Management Hook
 * Connects UI components to transport, controller services, and real-time telemetry.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RobotController } from '../services/controller/RobotController';
import { TelemetryService } from '../services/telemetry/TelemetryService';
import { RobotTelemetry } from '../types/telemetry';
import { ConnectionState, ConnectionConfig } from '../types/connection';
import { CameraMode } from '../types/camera';
import { CommandAck } from '../types/controller';
import { DEFAULT_CONNECTION_CONFIG } from '../config';
import { mapJoystickToVelocity, mapTwinStickToVelocity } from '../utils/math';

export function useRobotStore() {
  const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONNECTION_CONFIG);
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [telemetry, setTelemetry] = useState<RobotTelemetry>(TelemetryService.getInitialTelemetry());
  const [cameraMode, setCameraMode] = useState<CameraMode>('THIRD');
  const [lastAck, setLastAck] = useState<CommandAck | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [commandedVelocity, setCommandedVelocity] = useState<{ vx: number; vy: number; wz: number }>({
    vx: 0,
    vy: 0,
    wz: 0,
  });

  const controllerRef = useRef<RobotController | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Initialize controller singleton ref
  if (!controllerRef.current) {
    controllerRef.current = new RobotController(config.host, config.httpPort, config.wsPort);
  }

  const controller = controllerRef.current;

  useEffect(() => {
    // 1. Subscribe to WebSocket connection state changes
    const unsubStatus = controller.wsClient.onStatus((state, message) => {
      setConnectionState(state);
      if (message && state === 'ERROR') {
        setLastError(message);
      }
      if (state === 'CONNECTED') {
        setLastError(null);
      }
    });

    // 2. Subscribe to incoming telemetry frames
    const unsubFrame = controller.wsClient.onFrame((rawFrame) => {
      const parsed = TelemetryService.parseFrame(rawFrame);
      setTelemetry(parsed);

      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      if (delta > 0 && delta < 1000) {
        setLatencyMs(delta);
      }
    });

    // 3. Subscribe to command acknowledgements
    const unsubAck = controller.onAck((ack) => {
      setLastAck(ack);
      if (ack.status === 'rejected' || ack.status === 'error') {
        const msg = ack.lifecycle?.validation || ack.message || `Command ${ack.action} rejected`;
        setLastError(msg);
      } else {
        setLastError(null);
      }
    });

    // 4. Subscribe to camera changes
    const unsubCam = controller.cameraService.onCameraChange((mode) => {
      setCameraMode(mode);
    });

    return () => {
      unsubStatus();
      unsubFrame();
      unsubAck();
      unsubCam();
    };
  }, [controller]);

  // Connect action
  const connect = useCallback(async (customConfig?: Partial<ConnectionConfig>) => {
    const activeCfg = { ...config, ...customConfig };
    setConfig(activeCfg);
    setLastError(null);
    try {
      await controller.connect(activeCfg.host, activeCfg.httpPort, activeCfg.wsPort);
    } catch (err: any) {
      setLastError(err.message || 'Failed to initiate connection');
      setConnectionState('ERROR');
    }
  }, [config, controller]);

  // Disconnect action
  const disconnect = useCallback(async () => {
    await controller.disconnect();
    setConnectionState('DISCONNECTED');
    setTelemetry(TelemetryService.getInitialTelemetry());
  }, [controller]);

  // Command wrappers
  const stand = useCallback(async () => {
    setCommandedVelocity({ vx: 0, vy: 0, wz: 0 });
    return await controller.stand();
  }, [controller]);

  const damp = useCallback(async () => {
    setCommandedVelocity({ vx: 0, vy: 0, wz: 0 });
    return await controller.damp();
  }, [controller]);

  const stop = useCallback(async () => {
    setCommandedVelocity({ vx: 0, vy: 0, wz: 0 });
    return await controller.stop();
  }, [controller]);

  const fall = useCallback(async () => {
    setCommandedVelocity({ vx: 0, vy: 0, wz: 0 });
    return await controller.fall();
  }, [controller]);

  const getup = useCallback(async () => {
    setCommandedVelocity({ vx: 0, vy: 0, wz: 0 });
    return await controller.getup();
  }, [controller]);

  const reset = useCallback(async (seed?: number) => {
    setCommandedVelocity({ vx: 0, vy: 0, wz: 0 });
    return await controller.reset(seed);
  }, [controller]);

  // Single-stick touch handler (legacy/standard)
  const setJoystickPosition = useCallback((joyX: number, joyY: number) => {
    const vel = mapJoystickToVelocity(joyX, joyY);
    setCommandedVelocity(vel);
    controller.setTargetVelocity(vel.vx, vel.vy, vel.wz);
  }, [controller]);

  // Dual-stick gaming touch handler (Left: Move vx/vy, Right: Steer wz)
  const setTwinStickPosition = useCallback((moveX: number, moveY: number, turnX: number) => {
    const vel = mapTwinStickToVelocity(moveX, moveY, turnX, speedMultiplier);
    setCommandedVelocity(vel);
    controller.setTargetVelocity(vel.vx, vel.vy, vel.wz);
  }, [controller, speedMultiplier]);

  // Camera switch handler
  const switchCamera = useCallback((mode: CameraMode) => {
    controller.cameraService.setMode(mode);
  }, [controller]);

  // Viewport URL helper
  const getCameraSnapshotUrl = useCallback((cacheBuster: number) => {
    return controller.cameraService.getSnapshotUrl(cacheBuster);
  }, [controller]);

  return {
    config,
    connectionState,
    telemetry,
    cameraMode,
    lastAck,
    lastError,
    latencyMs,
    speedMultiplier,
    commandedVelocity,
    setSpeedMultiplier,
    connect,
    disconnect,
    stand,
    damp,
    stop,
    fall,
    getup,
    reset,
    setJoystickPosition,
    setTwinStickPosition,
    switchCamera,
    getCameraSnapshotUrl,
  };
}

/**
 * Asimov Controller - Mobile Gaming Landscape Controller Screen
 * Immersive full-screen camera viewport with sleek dual-stick gaming teleoperation,
 * minimalist status bar, and crystal-clear tactile action controls.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useRobotStore } from '../state/useRobotStore';
import { RobotViewport, RobotViewportRef } from '../components/RobotViewport/RobotViewport';
import { VirtualJoystick } from '../components/VirtualJoystick/VirtualJoystick';
import { DebugNetworkModal } from '../components/DebugModal/DebugNetworkModal';
import { CameraMode } from '../types/camera';
import { formatSimTime } from '../utils/formatting';

export interface ControllerScreenProps {
  store: ReturnType<typeof useRobotStore>;
  onNavigateToConnect: () => void;
}

export const ControllerScreen: React.FC<ControllerScreenProps> = ({
  store,
  onNavigateToConnect,
}) => {
  const {
    config,
    connectionState,
    transportMode,
    latencyMode,
    webrtcStats,
    telemetry,
    cameraMode,
    lastAck,
    lastError,
    latencyMs,
    speedMultiplier,
    commandedVelocity,
    setTransportMode,
    setLatencyMode,
    setSpeedMultiplier,
    connect,
    disconnect,
    stand,
    stop,
    getup,
    fall,
    reset,
    setTwinStickPosition,
    switchCamera,
    getCameraSnapshotUrl,
    handleBinaryTelemetry,
    handleWebRTCStats,
    setBinarySender,
  } = store;

  const [activeActionLoading, setActiveActionLoading] = useState<string | null>(null);
  const [isDebugModalVisible, setIsDebugModalVisible] = useState<boolean>(false);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState<boolean>(false);
  const viewportRef = useRef<RobotViewportRef>(null);

  // Twin-stick touch tracking references for simultaneous 2-thumb input
  const leftStick = useRef({ x: 0, y: 0 });
  const rightStick = useRef({ x: 0, y: 0 });

  // Hook WebRTC DataChannel binary sender to store
  React.useEffect(() => {
    if (transportMode === 'WEBRTC') {
      setBinarySender((bytes) => {
        viewportRef.current?.sendCommandBinary?.(bytes);
        return true;
      });
    } else {
      setBinarySender(null);
    }
  }, [transportMode, setBinarySender]);

  const handleLeftMove = (x: number, y: number) => {
    leftStick.current = { x, y };
    setTwinStickPosition(leftStick.current.x, leftStick.current.y, rightStick.current.x);
  };

  const handleLeftRelease = () => {
    leftStick.current = { x: 0, y: 0 };
    setTwinStickPosition(0, 0, rightStick.current.x);
  };

  const handleRightMove = (x: number, y: number) => {
    rightStick.current = { x, y };
    setTwinStickPosition(leftStick.current.x, leftStick.current.y, rightStick.current.x);
  };

  const handleRightRelease = () => {
    rightStick.current = { x: 0, y: 0 };
    setTwinStickPosition(leftStick.current.x, leftStick.current.y, 0);
  };

  const handleAction = async (actionName: string, fn: () => Promise<any>) => {
    setActiveActionLoading(actionName);
    try {
      await fn();
    } finally {
      setActiveActionLoading(null);
    }
  };

  const toggleSpeed = () => {
    if (speedMultiplier <= 0.6) {
      setSpeedMultiplier(1.0);
    } else if (speedMultiplier <= 1.1) {
      setSpeedMultiplier(1.5);
    } else {
      setSpeedMultiplier(0.5);
    }
  };

  const isConnected = connectionState === 'CONNECTED';
  const camModes: CameraMode[] = ['THIRD', 'FIRST', 'SECOND'];

  const modeColors: Record<string, string> = {
    STAND: '#00e5ff',
    MOVE: '#00e676',
    DAMP: '#ffb300',
    FAULT: '#ff3366',
    ESTOP: '#ff1744',
    UNKNOWN: '#6e7798',
  };

  const currentModeColor = modeColors[telemetry.mode] || '#00e5ff';
  const modeDisplayName =
    telemetry.mode === 'MOVE'
      ? 'WALKING'
      : telemetry.mode === 'STAND'
      ? 'READY'
      : telemetry.mode;

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* 1. IMMERSIVE FULL-SCREEN CAMERA BACKGROUND */}
      <RobotViewport
        ref={viewportRef}
        connected={isConnected}
        cameraMode={cameraMode}
        simTime={telemetry.simTime}
        getSnapshotUrl={getCameraSnapshotUrl}
        host={config.host}
        httpPort={config.httpPort}
        transportMode={transportMode}
        latencyMode={latencyMode}
        fullScreen={true}
        showHudOverlay={false}
        onWebRTCStats={handleWebRTCStats}
        onBinaryTelemetry={handleBinaryTelemetry}
        onTransportFallback={() => setTransportMode('LEGACY')}
      />

      {/* 2. TOP FLOATING MINIMALIST GLASS HUD */}
      <View style={styles.topHudBar}>
        {/* Left: Connection Pill & Settings */}
        <View style={styles.topLeftGroup}>
          <TouchableOpacity
            style={styles.settingsIconButton}
            activeOpacity={0.7}
            onPress={onNavigateToConnect}
          >
            <Text style={styles.settingsIconText}>⚙️</Text>
          </TouchableOpacity>

          <View style={styles.connectionPill}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: isConnected ? '#00e676' : '#ff3366' },
              ]}
            />
            <Text style={styles.connHostText} numberOfLines={1}>
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </Text>
            {isConnected && (
              <Text style={styles.connPingText}>
                {latencyMs > 0 ? `${latencyMs}ms` : '60FPS'}
              </Text>
            )}
          </View>
        </View>

        {/* Center: Clean Robot Status & Battery */}
        <View style={styles.topCenterGroup}>
          <View style={[styles.statusBadge, { borderColor: currentModeColor + '66' }]}>
            <View style={[styles.statusGlowDot, { backgroundColor: currentModeColor }]} />
            <Text style={[styles.statusText, { color: currentModeColor }]}>
              {modeDisplayName}
            </Text>
          </View>

          <View style={styles.batteryBadge}>
            <Text style={styles.batteryIcon}>⚡</Text>
            <Text style={styles.batteryText}>
              {telemetry.battery.socPercent.toFixed(0)}%
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.telemetryToggleBtn,
              isTelemetryDrawerOpen && styles.telemetryToggleBtnActive,
            ]}
            onPress={() => setIsTelemetryDrawerOpen(!isTelemetryDrawerOpen)}
            activeOpacity={0.7}
          >
            <Text style={styles.telemetryToggleText}>
              {isTelemetryDrawerOpen ? 'HIDE DATA' : 'TELEMETRY'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right: Camera Switcher Tabs & Disconnect */}
        <View style={styles.topRightGroup}>
          <View style={styles.cameraTabsContainer}>
            {camModes.map((mode) => {
              const active = cameraMode === mode;
              const shortLabel =
                mode === 'THIRD' ? 'CHASE' : mode === 'FIRST' ? 'FPV' : 'ARENA';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.camTab, active && styles.camTabActive]}
                  onPress={() => switchCamera(mode)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.camTabText, active && styles.camTabTextActive]}>
                    {shortLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isConnected ? (
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={disconnect}
              activeOpacity={0.7}
            >
              <Text style={styles.disconnectText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.connectQuickBtn}
              onPress={onNavigateToConnect}
              activeOpacity={0.7}
            >
              <Text style={styles.connectQuickText}>CONNECT</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. OPTIONAL EXPANDABLE TELEMETRY HUD DRAWER */}
      {isTelemetryDrawerOpen && (
        <View style={styles.telemetryDrawer}>
          <View style={styles.drawerItem}>
            <Text style={styles.drawerLabel}>ALTITUDE</Text>
            <Text style={styles.drawerValue}>{telemetry.base.position.z.toFixed(2)}m</Text>
          </View>
          <View style={styles.drawerItem}>
            <Text style={styles.drawerLabel}>FEET (L/R)</Text>
            <Text style={styles.drawerValue}>
              {telemetry.contacts.leftFoot ? '●' : '○'} /{' '}
              {telemetry.contacts.rightFoot ? '●' : '○'}
            </Text>
          </View>
          <View style={styles.drawerItem}>
            <Text style={styles.drawerLabel}>VELOCITY</Text>
            <Text style={styles.drawerValue}>
              {telemetry.base.linearVelocityBody.x.toFixed(2)} m/s
            </Text>
          </View>
          <View style={styles.drawerItem}>
            <Text style={styles.drawerLabel}>SIM TIME</Text>
            <Text style={styles.drawerValue}>{formatSimTime(telemetry.simTime)}</Text>
          </View>
          <TouchableOpacity
            style={styles.diagButton}
            onPress={() => setIsDebugModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.diagButtonText}>NET DIAG</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. DUAL-STICK GAMING TELEOP OVERLAY */}
      <View style={styles.controlsOverlay} pointerEvents="box-none">
        {/* ── LEFT CONTROLLER: MOVEMENT JOYSTICK & SPEED TOGGLE ── */}
        <View style={styles.leftControllerZone} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.speedToggleBtn}
            onPress={toggleSpeed}
            activeOpacity={0.7}
          >
            <Text style={styles.speedToggleText}>
              Speed: {speedMultiplier === 0.5 ? '0.5x' : speedMultiplier === 1.0 ? '1.0x' : '1.5x'}
            </Text>
          </TouchableOpacity>

          <VirtualJoystick
            radius={64}
            knobRadius={26}
            color="#a1a1aa"
            label="Move"
            mode="movement"
            subLabel={
              Math.abs(commandedVelocity.vx) > 0.01
                ? `${commandedVelocity.vx >= 0 ? '+' : ''}${commandedVelocity.vx.toFixed(2)} m/s`
                : undefined
            }
            disabled={!isConnected}
            onMove={handleLeftMove}
            onRelease={handleLeftRelease}
          />
        </View>

        {/* ── CENTER CONTROLLER: 3 PRIMARY ACTION CAPSULES ── */}
        <View style={styles.centerActionZone} pointerEvents="box-none">
          {/* Subtle Acknowledgement Toast */}
          {lastError ? (
            <View style={styles.toastError}>
              <Text style={styles.toastTextError}>⚠️ {lastError}</Text>
            </View>
          ) : lastAck && lastAck.action !== 'walk' ? (
            <View style={styles.toastSuccess}>
              <Text style={styles.toastTextSuccess}>
                ✓ {lastAck.action.toUpperCase()}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionCapsulesRow} pointerEvents="box-none">
            {/* STAND BUTTON */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnStand]}
              disabled={!isConnected || activeActionLoading === 'stand'}
              onPress={() => handleAction('stand', stand)}
              activeOpacity={0.7}
            >
              {activeActionLoading === 'stand' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnStandTitle}>Stand</Text>
              )}
            </TouchableOpacity>

            {/* STOP BUTTON */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnStop]}
              disabled={!isConnected || activeActionLoading === 'stop'}
              onPress={() => handleAction('stop', stop)}
              activeOpacity={0.7}
            >
              {activeActionLoading === 'stop' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnStopTitle}>Stop</Text>
              )}
            </TouchableOpacity>

            {/* RECOVER BUTTON */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnRecover]}
              disabled={!isConnected || activeActionLoading === 'recover'}
              onPress={() => handleAction('recover', getup)}
              activeOpacity={0.7}
            >
              {activeActionLoading === 'recover' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnRecoverTitle}>Recover</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── RIGHT CONTROLLER: STEERING STICK ── */}
        <View style={styles.rightControllerZone} pointerEvents="box-none">
          <VirtualJoystick
            radius={64}
            knobRadius={26}
            color="#a1a1aa"
            label="Steer"
            mode="steering"
            subLabel={
              Math.abs(commandedVelocity.wz) > 0.01
                ? `${commandedVelocity.wz >= 0 ? '+' : ''}${commandedVelocity.wz.toFixed(2)} rad/s`
                : undefined
            }
            disabled={!isConnected}
            onMove={handleRightMove}
            onRelease={handleRightRelease}
          />
        </View>
      </View>

      {/* 5. DIAGNOSTICS & TELEMETRY MODAL */}
      <DebugNetworkModal
        visible={isDebugModalVisible}
        onClose={() => setIsDebugModalVisible(false)}
        connectionState={connectionState}
        transportMode={transportMode}
        latencyMode={latencyMode}
        webrtcStats={webrtcStats}
        telemetry={telemetry}
        host={config.host}
        httpPort={config.httpPort}
        wsPort={config.wsPort}
        onToggleTransport={() =>
          setTransportMode(transportMode === 'WEBRTC' ? 'LEGACY' : 'WEBRTC')
        }
        onChangeLatencyMode={setLatencyMode}
        onForceReconnect={() => {
          disconnect();
          connect();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02040a',
  },

  /* ── TOP HUD BAR ── */
  topHudBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 8,
    left: 16,
    right: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
  },

  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconText: {
    fontSize: 14,
  },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connHostText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  connPingText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },

  /* Center Group */
  topCenterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e4e4e7',
    letterSpacing: 0.5,
  },
  batteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  batteryIcon: {
    fontSize: 11,
    color: '#10b981',
  },
  batteryText: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '600',
  },
  telemetryToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  telemetryToggleBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  telemetryToggleText: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  /* Right Group */
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  camTab: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  camTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  camTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717a',
    letterSpacing: 0.3,
  },
  camTabTextActive: {
    color: '#ffffff',
  },
  disconnectButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  connectQuickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  connectQuickText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── EXPANDABLE TELEMETRY DRAWER ── */
  telemetryDrawer: {
    position: 'absolute',
    top: 60,
    left: '20%',
    right: '20%',
    backgroundColor: 'rgba(8, 12, 22, 0.88)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 19,
  },
  drawerItem: {
    alignItems: 'center',
  },
  drawerLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  drawerValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  diagButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  diagButtonText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },

  /* ── CONTROLS OVERLAY ── */
  controlsOverlay: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 15,
  },

  /* Left Zone */
  leftControllerZone: {
    alignItems: 'center',
    gap: 8,
  },
  speedToggleBtn: {
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  speedToggleText: {
    color: '#e4e4e7',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  /* Center Zone (Action Bar & Toast) */
  centerActionZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    gap: 8,
  },
  toastSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  toastTextSuccess: {
    color: '#00e676',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toastError: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  toastTextError: {
    color: '#ff3366',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  actionCapsulesRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionBtn: {
    width: 74,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStand: {
    backgroundColor: '#2563eb',
  },
  btnStandTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  btnStop: {
    backgroundColor: '#dc2626',
  },
  btnStopTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  btnRecover: {
    backgroundColor: '#4b5563',
  },
  btnRecoverTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  /* Right Zone */
  rightControllerZone: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});

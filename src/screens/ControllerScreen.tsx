/**
 * Asimov Controller - Mobile Gaming Landscape Controller Screen
 * Immersive full-screen camera viewport with dual-stick gaming teleoperation,
 * floating glassmorphism telemetry HUD, and tactile arcade action buttons.
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
import { CameraMode, CAMERA_DEFINITIONS } from '../types/camera';
import { TransportMode, LatencyMode } from '../types/connection';
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
    damp,
    stop,
    fall,
    getup,
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

  return (
    <View style={styles.container}>
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

      {/* 2. TOP FLOATING GLASSMORPHISM HUD */}
      <View style={styles.topHudBar}>
        {/* Left: Settings, Connection & Diagnostics */}
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
              {config.host}
            </Text>
            {isConnected && (
              <Text style={styles.connPingText}>{latencyMs > 0 ? `${latencyMs}ms` : '30Hz'}</Text>
            )}
          </View>

          {/* Realtime Engineering Telemetry Diagnostic Pill */}
          <TouchableOpacity
            style={styles.diagPill}
            activeOpacity={0.7}
            onPress={() => setIsDebugModalVisible(true)}
          >
            <View
              style={[
                styles.diagDot,
                { backgroundColor: transportMode === 'WEBRTC' ? '#00e5ff' : '#ffb300' },
              ]}
            />
            <Text style={styles.diagText}>
              {transportMode === 'WEBRTC'
                ? `${webrtcStats.fps || 60}FPS H.264`
                : 'LEGACY 25FPS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center: Live Telemetry Badges */}
        <View style={styles.topCenterGroup}>
          {/* Robot State Badge */}
          <View style={[styles.telemetryBadge, { borderColor: currentModeColor + '88' }]}>
            <Text style={[styles.modeLabel, { color: currentModeColor }]}>
              {telemetry.mode}
            </Text>
            {telemetry.submode !== 'NONE' && (
              <Text style={styles.submodeLabel}>{telemetry.submode}</Text>
            )}
          </View>

          {/* Sim Time */}
          <View style={styles.telemetryBadge}>
            <Text style={styles.hudMetricLabel}>SIM</Text>
            <Text style={styles.simTimeText}>{formatSimTime(telemetry.simTime)}</Text>
          </View>

          {/* Base Height */}
          <View style={styles.telemetryBadge}>
            <Text style={styles.hudMetricLabel}>ALT</Text>
            <Text style={styles.metricValText}>{telemetry.base.position.z.toFixed(2)}m</Text>
          </View>

          {/* Foot Contacts */}
          <View style={styles.telemetryBadge}>
            <Text style={styles.hudMetricLabel}>FEET</Text>
            <View style={styles.contactsRow}>
              <View
                style={[
                  styles.footDot,
                  telemetry.contacts.leftFoot && styles.footDotActive,
                ]}
              >
                <Text style={styles.footText}>L</Text>
              </View>
              <View
                style={[
                  styles.footDot,
                  telemetry.contacts.rightFoot && styles.footDotActive,
                ]}
              >
                <Text style={styles.footText}>R</Text>
              </View>
            </View>
          </View>

          {/* Battery */}
          <View style={styles.telemetryBadge}>
            <Text style={styles.hudMetricLabel}>⚡</Text>
            <Text style={styles.battText}>{telemetry.battery.socPercent.toFixed(0)}%</Text>
          </View>
        </View>

        {/* Right: Quick Camera View Switcher & Disconnect */}
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

      {/* 3. DUAL-STICK GAMING TELEOP OVERLAY */}
      <View style={styles.controlsOverlay} pointerEvents="box-none">
        {/* ── LEFT CONTROLLER: MOVEMENT JOYSTICK & SPEED GEARS ── */}
        <View style={styles.leftControllerZone} pointerEvents="box-none">
          {/* Speed Multiplier Selector */}
          <View style={styles.speedGearsRow}>
            {[0.5, 1.0, 1.5].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.gearPill, speedMultiplier === s && styles.gearPillActive]}
                onPress={() => setSpeedMultiplier(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gearPillText, speedMultiplier === s && styles.gearPillTextActive]}>
                  {s === 0.5 ? 'SLOW' : s === 1.0 ? '1.0x' : 'TURBO'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Left Movement Thumbstick */}
          <VirtualJoystick
            radius={64}
            knobRadius={26}
            color="#00e5ff"
            label="MOVE"
            mode="movement"
            subLabel={`vx: ${commandedVelocity.vx >= 0 ? '+' : ''}${commandedVelocity.vx.toFixed(2)}`}
            disabled={!isConnected}
            onMove={handleLeftMove}
            onRelease={handleLeftRelease}
          />
        </View>

        {/* ── CENTER HUD: COMMAND LIFECYCLE ACK TOAST ── */}
        <View style={styles.centerHudZone} pointerEvents="none">
          {lastError ? (
            <View style={styles.ackToastError}>
              <Text style={styles.ackToastTitle}>⚠️ REJECTED</Text>
              <Text style={styles.ackToastSub} numberOfLines={1}>
                {lastError}
              </Text>
            </View>
          ) : lastAck ? (
            <View style={styles.ackToastSuccess}>
              <Text style={styles.ackToastTitle}>
                ✓ {lastAck.action.toUpperCase()}
              </Text>
              <Text style={styles.ackToastSub} numberOfLines={1}>
                {lastAck.lifecycle?.applied || 'Command applied'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── RIGHT CONTROLLER: STEERING STICK & ARCADE ACTION DIAMOND ── */}
        <View style={styles.rightControllerZone} pointerEvents="box-none">
          {/* Secondary Utility Triggers (Top) */}
          <View style={styles.utilityRow}>
            <TouchableOpacity
              style={[styles.utilityBtn, styles.safefallBtn]}
              disabled={!isConnected || activeActionLoading === 'fall'}
              onPress={() => handleAction('fall', fall)}
              activeOpacity={0.7}
            >
              <Text style={styles.safefallBtnText}>
                {activeActionLoading === 'fall' ? '...' : 'SAFE FALL'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.utilityBtn, styles.resetBtn]}
              disabled={!isConnected || activeActionLoading === 'reset'}
              onPress={() => handleAction('reset', reset)}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBtnText}>
                {activeActionLoading === 'reset' ? '...' : 'RESET SIM'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rightControlsRow} pointerEvents="box-none">
            {/* Right Steering Stick (Yaw Turn wz) */}
            <View style={styles.turnStickWrapper}>
              <VirtualJoystick
                radius={58}
                knobRadius={24}
                color="#b388ff"
                label="STEER"
                mode="steering"
                subLabel={`wz: ${commandedVelocity.wz >= 0 ? '+' : ''}${commandedVelocity.wz.toFixed(2)}`}
                disabled={!isConnected}
                onMove={handleRightMove}
                onRelease={handleRightRelease}
              />
            </View>

            {/* Game Action Buttons Diamond Cluster */}
            <View style={styles.actionDiamondPad}>
              {/* TOP: STAND (Arm & Balance) */}
              <TouchableOpacity
                style={[styles.diamondBtn, styles.btnStand]}
                disabled={!isConnected || activeActionLoading === 'stand'}
                onPress={() => handleAction('stand', stand)}
                activeOpacity={0.6}
              >
                {activeActionLoading === 'stand' ? (
                  <ActivityIndicator size="small" color="#00e5ff" />
                ) : (
                  <>
                    <Text style={styles.diamondBtnTitleCyan}>STAND</Text>
                    <Text style={styles.diamondBtnSubCyan}>BALANCE</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.diamondMidRow}>
                {/* LEFT: DAMP (Compliant Limp) */}
                <TouchableOpacity
                  style={[styles.diamondBtn, styles.btnDamp]}
                  disabled={!isConnected || activeActionLoading === 'damp'}
                  onPress={() => handleAction('damp', damp)}
                  activeOpacity={0.6}
                >
                  {activeActionLoading === 'damp' ? (
                    <ActivityIndicator size="small" color="#ffb300" />
                  ) : (
                    <>
                      <Text style={styles.diamondBtnTitleAmber}>DAMP</Text>
                      <Text style={styles.diamondBtnSubAmber}>PARK</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* RIGHT: STOP (Zero Velocity Brake) */}
                <TouchableOpacity
                  style={[styles.diamondBtn, styles.btnStop]}
                  disabled={!isConnected || activeActionLoading === 'stop'}
                  onPress={() => handleAction('stop', stop)}
                  activeOpacity={0.6}
                >
                  {activeActionLoading === 'stop' ? (
                    <ActivityIndicator size="small" color="#ff1744" />
                  ) : (
                    <>
                      <Text style={styles.diamondBtnTitleRed}>STOP</Text>
                      <Text style={styles.diamondBtnSubRed}>BRAKE</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* BOTTOM: GET UP (Recover Stance) */}
              <TouchableOpacity
                style={[styles.diamondBtn, styles.btnGetup]}
                disabled={!isConnected || activeActionLoading === 'getup'}
                onPress={() => handleAction('getup', getup)}
                activeOpacity={0.6}
              >
                {activeActionLoading === 'getup' ? (
                  <ActivityIndicator size="small" color="#00e676" />
                ) : (
                  <>
                    <Text style={styles.diamondBtnTitleGreen}>GET UP</Text>
                    <Text style={styles.diamondBtnSubGreen}>RECOVER</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 4. ENGINEERING DIAGNOSTICS & NETWORK MODAL */}
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
        onToggleTransport={() => {
          setTransportMode(transportMode === 'WEBRTC' ? 'LEGACY' : 'WEBRTC');
        }}
        onChangeLatencyMode={setLatencyMode}
        onForceReconnect={() => {
          disconnect().then(() => connect());
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070c',
    position: 'relative',
  },

  diagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070b14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    gap: 6,
  },
  diagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  diagText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },

  /* ── TOP HUD ── */
  topHudBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 8 : 12,
    left: 14,
    right: 14,
    height: 44,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0d18cc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f263e',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsIconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#161c2d',
    borderWidth: 1,
    borderColor: '#29334e',
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
    backgroundColor: '#121726',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#232b42',
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connHostText: {
    color: '#cdd3e8',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    maxWidth: 100,
  },
  connPingText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },

  topCenterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111624',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#232b42',
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  submodeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8b94b0',
    backgroundColor: '#1b2234',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  hudMetricLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#656d8a',
  },
  simTimeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  metricValText: {
    color: '#dbe0f0',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  contactsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  footDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1b2030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footDotActive: {
    backgroundColor: '#00e676',
  },
  footText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#080a10',
  },
  battText: {
    color: '#00e676',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },

  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#121726',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#232b42',
    padding: 2,
    gap: 2,
  },
  camTab: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  camTabActive: {
    backgroundColor: '#00e5ff24',
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  camTabText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#707998',
  },
  camTabTextActive: {
    color: '#00e5ff',
  },
  disconnectButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ff336620',
    borderWidth: 1,
    borderColor: '#ff3366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: {
    color: '#ff3366',
    fontSize: 11,
    fontWeight: '900',
  },
  connectQuickBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#00e5ff',
  },
  connectQuickText: {
    color: '#07090f',
    fontSize: 10,
    fontWeight: '900',
  },

  /* ── CONTROLS OVERLAY ── */
  controlsOverlay: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 15,
  },

  /* Left Zone (Movement Stick & Gear Toggle) */
  leftControllerZone: {
    alignItems: 'center',
    gap: 8,
  },
  speedGearsRow: {
    flexDirection: 'row',
    backgroundColor: '#0b0f1bcc',
    padding: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#212a42',
    gap: 4,
  },
  gearPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  gearPillActive: {
    backgroundColor: '#00e5ff22',
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  gearPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#656e8c',
  },
  gearPillTextActive: {
    color: '#00e5ff',
  },

  /* Center Zone (Ack Toast) */
  centerHudZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  ackToastSuccess: {
    backgroundColor: '#081a17dd',
    borderWidth: 1,
    borderColor: '#00e67688',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  ackToastError: {
    backgroundColor: '#200810dd',
    borderWidth: 1,
    borderColor: '#ff336688',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  ackToastTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#dbe0f0',
  },
  ackToastSub: {
    fontSize: 8,
    color: '#8b94b0',
    marginTop: 1,
  },

  /* Right Zone (Steering Stick + Action Diamond) */
  rightControllerZone: {
    alignItems: 'flex-end',
    gap: 6,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  utilityBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
  },
  safefallBtn: {
    backgroundColor: '#1b1d28cc',
    borderColor: '#42485e',
  },
  safefallBtnText: {
    color: '#a0a8c2',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetBtn: {
    backgroundColor: '#241a2ecc',
    borderColor: '#7843a6',
  },
  resetBtnText: {
    color: '#d4a4ff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  turnStickWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Action Buttons Diamond */
  actionDiamondPad: {
    width: 146,
    height: 146,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondMidRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diamondBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  btnStand: {
    backgroundColor: '#00e5ff1c',
    borderColor: '#00e5ff',
    shadowColor: '#00e5ff',
  },
  diamondBtnTitleCyan: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '900',
  },
  diamondBtnSubCyan: {
    color: '#00e5ffaa',
    fontSize: 7,
    fontWeight: '700',
  },

  btnDamp: {
    backgroundColor: '#ffb3001c',
    borderColor: '#ffb300',
    shadowColor: '#ffb300',
  },
  diamondBtnTitleAmber: {
    color: '#ffb300',
    fontSize: 10,
    fontWeight: '900',
  },
  diamondBtnSubAmber: {
    color: '#ffb300aa',
    fontSize: 7,
    fontWeight: '700',
  },

  btnStop: {
    backgroundColor: '#ff174426',
    borderColor: '#ff1744',
    shadowColor: '#ff1744',
  },
  diamondBtnTitleRed: {
    color: '#ff1744',
    fontSize: 10,
    fontWeight: '900',
  },
  diamondBtnSubRed: {
    color: '#ff1744aa',
    fontSize: 7,
    fontWeight: '700',
  },

  btnGetup: {
    backgroundColor: '#00e6761c',
    borderColor: '#00e676',
    shadowColor: '#00e676',
  },
  diamondBtnTitleGreen: {
    color: '#00e676',
    fontSize: 9,
    fontWeight: '900',
  },
  diamondBtnSubGreen: {
    color: '#00e676aa',
    fontSize: 7,
    fontWeight: '700',
  },
});

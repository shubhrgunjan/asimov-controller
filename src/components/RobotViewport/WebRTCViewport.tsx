/**
 * Asimov Controller - WebRTC Native Surface Viewport
 * Hardware-accelerated H.264 video rendering via native WebRTC SurfaceView.
 * Completely offloads high-rate video frames from the React Native JS thread.
 */

import React, { useRef, useImperativeHandle, forwardRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { CameraMode, CAMERA_DEFINITIONS } from '../../types/camera';
import { WebRTCStats, LatencyMode } from '../../types/connection';
import { RobotTelemetry } from '../../types/telemetry';
import { CommandAck } from '../../types/controller';
import { BinaryProtocol } from '../../services/transport/BinaryProtocol';

export interface WebRTCViewportProps {
  host: string;
  httpPort: number;
  cameraMode: CameraMode;
  connected: boolean;
  latencyMode?: LatencyMode;
  onStatsChange?: (stats: WebRTCStats) => void;
  onBinaryTelemetry?: (telemetry: RobotTelemetry) => void;
  onAck?: (ack: CommandAck) => void;
  onError?: (err: string) => void;
}

export interface WebRTCViewportRef {
  sendCommandBinary: (bytes: Uint8Array | number[]) => void;
  switchCamera: (simCameraName: string) => void;
  setLatencyMode: (mode: LatencyMode) => void;
  reconnect: () => void;
}

export const WebRTCViewport = forwardRef<WebRTCViewportRef, WebRTCViewportProps>(
  (
    {
      host,
      httpPort,
      cameraMode,
      connected,
      latencyMode = 'LOW_LATENCY',
      onStatsChange,
      onBinaryTelemetry,
      onAck,
      onError,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isVideoActive, setIsVideoActive] = useState<boolean>(false);
    const [statusTitle, setStatusTitle] = useState<string>('INITIALIZING WEBRTC H.264');
    const [statusDetail, setStatusDetail] = useState<string>('Connecting to simulator...');

    const camDef = CAMERA_DEFINITIONS[cameraMode];
    const prevCameraModeRef = useRef<CameraMode>(cameraMode);

    // Native player URL served directly by the VASIMOV gateway
    const playerUrl = `http://${host}:${httpPort}/webrtc_player.html?identity=android_teleop&mode=${latencyMode}&t=${Date.now()}`;

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
      sendCommandBinary: (bytes: Uint8Array | number[]) => {
        if (!webViewRef.current) return;
        const arr = bytes instanceof Uint8Array ? Array.from(bytes) : bytes;
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'send_command_binary',
            bytes: arr,
          })
        );
      },
      switchCamera: (simCameraName: string) => {
        if (!webViewRef.current) return;
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'switch_camera',
            camera: simCameraName,
          })
        );
      },
      setLatencyMode: (mode: LatencyMode) => {
        if (!webViewRef.current) return;
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'set_mode',
            mode,
          })
        );
      },
      reconnect: () => {
        if (!webViewRef.current) return;
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'reconnect',
          })
        );
      },
    }));

    // Trigger camera switch when cameraMode prop changes
    useEffect(() => {
      if (prevCameraModeRef.current !== cameraMode && webViewRef.current) {
        prevCameraModeRef.current = cameraMode;
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'switch_camera',
            camera: camDef.simCameraName,
          })
        );
      }
    }, [cameraMode, camDef.simCameraName]);

    // Handle messages sent from the HTML5 WebRTC player inside WebView
    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (!data || !data.type) return;

          switch (data.type) {
            case 'video_active':
              setIsVideoActive(true);
              break;

            case 'status_change':
              setStatusTitle(data.title || '');
              setStatusDetail(data.detail || '');
              if (data.isConnected === false) {
                setIsVideoActive(false);
              }
              break;

            case 'webrtc_stats':
              if (onStatsChange && data.stats) {
                onStatsChange(data.stats);
              }
              break;

            case 'binary_telemetry':
              if (onBinaryTelemetry && Array.isArray(data.bytes)) {
                const u8 = new Uint8Array(data.bytes);
                const unpacked = BinaryProtocol.unpackTelemetry(u8);
                if (unpacked) {
                  onBinaryTelemetry(unpacked.telemetry);
                }
              }
              break;

            case 'command_ack':
              if (onAck && data.ack) {
                onAck(data.ack);
              }
              break;

            case 'error':
              if (onError) {
                onError(data.error || 'WebRTC pipeline error');
              }
              break;

            case 'disconnected':
              setIsVideoActive(false);
              break;

            default:
              break;
          }
        } catch {
          // Ignore non-json messages
        }
      },
      [onStatsChange, onBinaryTelemetry, onAck, onError]
    );

    return (
      <View style={styles.container}>
        {/* Hardware-Accelerated WebView Native Video Surface */}
        {connected ? (
          <WebView
            ref={webViewRef}
            source={{ uri: playerUrl }}
            style={styles.webView}
            originWhitelist={['*']}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={false}
            incognito={true}
            androidLayerType="hardware"
            mixedContentMode="always"
            onMessage={handleMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              onError?.(nativeEvent.description || 'WebView failed to load player');
            }}
          />
        ) : null}

        {/* Loading / Standby Overlay */}
        {(!connected || !isVideoActive) && (
          <View style={styles.standbyContainer} pointerEvents="none">
            <View style={styles.radarRing}>
              <ActivityIndicator color="#00e5ff" size="large" />
            </View>
            <Text style={styles.standbyTitle}>
              {connected ? statusTitle : 'Virtual Asimov Offline'}
            </Text>
            <Text style={styles.standbySub}>
              {connected
                ? `${statusDetail} (${camDef.displayName})`
                : 'Start Virtual Asimov with ./run_sim.sh --web'}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#02040a',
    overflow: 'hidden',
  },
  webView: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#02040a',
  },
  standbyContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 4, 10, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 24,
  },
  radarRing: {
    marginBottom: 16,
  },
  standbyTitle: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  standbySub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 18,
  },
});

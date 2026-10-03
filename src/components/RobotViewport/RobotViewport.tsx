/**
 * Asimov Controller - Live Simulation Camera Viewport
 * High-performance double-buffered renderer with sequential adaptive pacing.
 * Eliminates frame flickering, black blinks, and network request thrashing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraMode, CAMERA_DEFINITIONS } from '../../types/camera';
import { formatSimTime } from '../../utils/formatting';

export interface RobotViewportProps {
  connected: boolean;
  cameraMode: CameraMode;
  simTime: number;
  getSnapshotUrl: (cacheBuster: number) => string;
  fullScreen?: boolean;
  showHudOverlay?: boolean;
}

export const RobotViewport: React.FC<RobotViewportProps> = ({
  connected,
  cameraMode,
  simTime,
  getSnapshotUrl,
  fullScreen = true,
  showHudOverlay = false,
}) => {
  // Double-buffering: two permanent Image layers
  const [frameA, setFrameA] = useState<string>('');
  const [frameB, setFrameB] = useState<string>('');
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
  const [hasReceivedFirstFrame, setHasReceivedFirstFrame] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);

  const camDef = CAMERA_DEFINITIONS[cameraMode];
  const isMountedRef = useRef<boolean>(true);
  const activeLayerRef = useRef<'A' | 'B'>('A');
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<any>(null);
  const watchdogTimerRef = useRef<any>(null);
  const nextFrameTimerRef = useRef<any>(null);

  const connectedRef = useRef(connected);
  connectedRef.current = connected;
  const getSnapshotUrlRef = useRef(getSnapshotUrl);
  getSnapshotUrlRef.current = getSnapshotUrl;

  // Clear timers helper
  const clearAllTimers = useCallback(() => {
    if (nextFrameTimerRef.current) {
      clearTimeout(nextFrameTimerRef.current);
      nextFrameTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  // Request next frame into the specified background layer
  const loadIntoTargetLayer = useCallback(
    (targetLayer: 'A' | 'B', delayMs: number = 40) => {
      clearAllTimers();

      if (!connectedRef.current || !isMountedRef.current) return;

      nextFrameTimerRef.current = setTimeout(() => {
        if (!connectedRef.current || !isMountedRef.current) return;

        const nextUrl = getSnapshotUrlRef.current(Date.now());

        if (targetLayer === 'A') {
          setFrameA(nextUrl);
        } else {
          setFrameB(nextUrl);
        }

        // Safety watchdog: if the background frame takes > 1200ms to load, retry
        watchdogTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && connectedRef.current) {
            loadIntoTargetLayer(targetLayer, 100);
          }
        }, 1200);
      }, delayMs);
    },
    [clearAllTimers]
  );

  // Handle successful image load event on Layer A
  const handleLoadA = useCallback(() => {
    if (!isMountedRef.current) return;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    setHasReceivedFirstFrame(true);
    frameCountRef.current += 1;

    // Layer A has completed loading -> switch active layer to A
    activeLayerRef.current = 'A';
    setActiveLayer('A');

    // Load next frame into Layer B (background)
    loadIntoTargetLayer('B', 40);
  }, [loadIntoTargetLayer]);

  // Handle successful image load event on Layer B
  const handleLoadB = useCallback(() => {
    if (!isMountedRef.current) return;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    setHasReceivedFirstFrame(true);
    frameCountRef.current += 1;

    // Layer B has completed loading -> switch active layer to B
    activeLayerRef.current = 'B';
    setActiveLayer('B');

    // Load next frame into Layer A (background)
    loadIntoTargetLayer('A', 40);
  }, [loadIntoTargetLayer]);

  // Handle errors: retry into the current target layer without flipping or clearing the active layer
  const handleErrorA = useCallback(() => {
    if (!isMountedRef.current) return;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    loadIntoTargetLayer('A', 150);
  }, [loadIntoTargetLayer]);

  const handleErrorB = useCallback(() => {
    if (!isMountedRef.current) return;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    loadIntoTargetLayer('B', 150);
  }, [loadIntoTargetLayer]);

  // Track FPS calculation every second
  useEffect(() => {
    fpsTimerRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    return () => {
      if (fpsTimerRef.current) {
        clearInterval(fpsTimerRef.current);
        fpsTimerRef.current = null;
      }
    };
  }, []);

  // Primary lifecycle loop
  useEffect(() => {
    isMountedRef.current = true;

    if (!connected) {
      setHasReceivedFirstFrame(false);
      clearAllTimers();
      setFrameA('');
      setFrameB('');
      return;
    }

    // Start initial frame fetch into Layer A
    activeLayerRef.current = 'A';
    setActiveLayer('A');
    setFrameA(getSnapshotUrl(Date.now()));

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [connected, cameraMode, getSnapshotUrl, clearAllTimers]);

  return (
    <View style={[styles.wrapper, fullScreen ? styles.wrapperFullScreen : styles.wrapperInline]}>
      {/* Layer A (Double-Buffered Image Slot 1) */}
      {frameA ? (
        <Image
          source={{ uri: frameA }}
          style={[
            styles.imageLayer,
            {
              opacity: activeLayer === 'A' && hasReceivedFirstFrame ? 1 : 0,
              zIndex: activeLayer === 'A' ? 2 : 1,
            },
          ]}
          resizeMode={fullScreen ? 'cover' : 'contain'}
          fadeDuration={0}
          onLoad={handleLoadA}
          onError={handleErrorA}
        />
      ) : null}

      {/* Layer B (Double-Buffered Image Slot 2) */}
      {frameB ? (
        <Image
          source={{ uri: frameB }}
          style={[
            styles.imageLayer,
            {
              opacity: activeLayer === 'B' && hasReceivedFirstFrame ? 1 : 0,
              zIndex: activeLayer === 'B' ? 2 : 1,
            },
          ]}
          resizeMode={fullScreen ? 'cover' : 'contain'}
          fadeDuration={0}
          onLoad={handleLoadB}
          onError={handleErrorB}
        />
      ) : null}

      {/* Loading or Disconnected Placeholder */}
      {(!connected || !hasReceivedFirstFrame) && (
        <View style={styles.standbyContainer}>
          <Text style={styles.standbyIcon}>🤖</Text>
          <Text style={styles.standbyTitle}>
            {connected ? 'Acquiring Simulation Camera Feed...' : 'Virtual Asimov Offline'}
          </Text>
          <Text style={styles.standbySub}>
            {connected
              ? `Streaming 3D perspective from ${camDef.displayName}`
              : 'Start Virtual Asimov with ./run_sim.sh --web'}
          </Text>
          {connected && <ActivityIndicator color="#00e5ff" size="large" style={{ marginTop: 14 }} />}
        </View>
      )}

      {/* Fullscreen Cyber Vignette / Corner Accents */}
      {fullScreen && (
        <View style={styles.vignetteOverlay} pointerEvents="none">
          <View style={[styles.cornerBracket, styles.topLeftBracket]} />
          <View style={[styles.cornerBracket, styles.topRightBracket]} />
          <View style={[styles.cornerBracket, styles.bottomLeftBracket]} />
          <View style={[styles.cornerBracket, styles.bottomRightBracket]} />
        </View>
      )}

      {/* Optional In-Viewport HUD (for inline mode or diagnostics) */}
      {showHudOverlay && (
        <>
          <View style={styles.overlayHeader}>
            <View style={styles.camBadge}>
              <View style={[styles.statusDot, { backgroundColor: connected ? '#00e676' : '#ff3366' }]} />
              <Text style={styles.camText}>{camDef.displayName}</Text>
            </View>
            <View style={styles.fpsBadge}>
              <Text style={styles.fpsText}>{fps > 0 ? `${fps} FPS` : 'LIVE'}</Text>
            </View>
            <Text style={styles.simTimeText}>
              {connected ? `SIM: ${formatSimTime(simTime)}` : 'SIM: OFFLINE'}
            </Text>
          </View>

          <View style={styles.overlayFooter}>
            <Text style={styles.footerText}>
              {connected ? `MuJoCo: ${camDef.simCameraName} (Double-Buffered)` : 'No Signal'}
            </Text>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#050609',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapperFullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  wrapperInline: {
    width: '100%',
    minHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1d2232',
  },
  imageLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  standbyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    backgroundColor: '#07090e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  standbyIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  standbyTitle: {
    color: '#dbe0f0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  standbySub: {
    color: '#656d8a',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 320,
  },
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  cornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#00e5ff44',
  },
  topLeftBracket: {
    top: 14,
    left: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  topRightBracket: {
    top: 14,
    right: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bottomLeftBracket: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRightBracket: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  overlayHeader: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  camBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0d16cc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#262d42',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  camText: {
    color: '#e2e6f3',
    fontSize: 10,
    fontWeight: '700',
  },
  fpsBadge: {
    backgroundColor: '#00e5ff18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00e5ff55',
  },
  fpsText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  simTimeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: '#0a0d16cc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#262d42',
  },
  overlayFooter: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  footerText: {
    color: '#6e7798',
    fontSize: 8,
    backgroundColor: '#0a0d16cc',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
});

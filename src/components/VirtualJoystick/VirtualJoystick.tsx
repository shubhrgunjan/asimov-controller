/**
 * Asimov Controller - Mobile Gaming Virtual Joystick Component
 * Implements a 2D touch responder with circular bounds, deadzone filtering,
 * auto-centering, cybernetic glowing HUD styling, and directional indicators.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Text,
} from 'react-native';
import { normalizeJoystickInput } from '../../utils/math';

export interface VirtualJoystickProps {
  radius?: number;
  knobRadius?: number;
  deadzone?: number;
  color?: string;
  label?: string;
  subLabel?: string;
  mode?: 'movement' | 'steering';
  onMove: (x: number, y: number) => void;
  onRelease: () => void;
  disabled?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  radius = 65,
  knobRadius = 26,
  deadzone = 0.08,
  color = '#00e5ff',
  label = 'MOVE',
  subLabel,
  mode = 'movement',
  onMove,
  onRelease,
  disabled = false,
}) => {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        if (disabled) return;
        setIsActive(true);
        touchStartRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
      },

      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (disabled) return;
        const dx = gestureState.dx;
        const dy = gestureState.dy;

        const norm = normalizeJoystickInput(dx, dy, radius, deadzone);

        // Clamped visual knob position
        const dist = Math.hypot(dx, dy);
        const visualClampedDist = Math.min(dist, radius);
        const angle = Math.atan2(dy, dx);

        const visualX = Math.cos(angle) * visualClampedDist;
        const visualY = Math.sin(angle) * visualClampedDist;

        setKnobOffset({ x: visualX, y: visualY });

        // Emit normalized values [-1.0, 1.0]
        onMove(norm.x, norm.y);
      },

      onPanResponderRelease: () => {
        setIsActive(false);
        setKnobOffset({ x: 0, y: 0 });
        onRelease();
      },

      onPanResponderTerminate: () => {
        setIsActive(false);
        setKnobOffset({ x: 0, y: 0 });
        onRelease();
      },
    })
  ).current;

  const baseSize = radius * 2;
  const knobSize = knobRadius * 2;
  const activeColor = disabled ? '#3b4258' : color;

  return (
    <View style={[styles.container, { width: baseSize, height: baseSize + 28 }]}>
      {/* Outer base track */}
      <View
        style={[
          styles.outerRing,
          {
            width: baseSize,
            height: baseSize,
            borderRadius: radius,
            borderColor: isActive ? activeColor : activeColor + '44',
            backgroundColor: isActive ? '#0d132299' : '#0a0d1688',
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Subtle crosshair guide lines */}
        <View style={[styles.crosshairX, { width: baseSize - 24 }]} />
        <View style={[styles.crosshairY, { height: baseSize - 24 }]} />

        {/* Directional markers */}
        {mode === 'movement' ? (
          <>
            <Text style={[styles.markerText, styles.markerTop, { color: activeColor + 'aa' }]}>▲</Text>
            <Text style={[styles.markerText, styles.markerBottom, { color: activeColor + 'aa' }]}>▼</Text>
            <Text style={[styles.markerText, styles.markerLeft, { color: activeColor + 'aa' }]}>◄</Text>
            <Text style={[styles.markerText, styles.markerRight, { color: activeColor + 'aa' }]}>►</Text>
          </>
        ) : (
          <>
            <Text style={[styles.markerText, styles.markerLeft, { color: activeColor + 'cc', fontSize: 13 }]}>⟲</Text>
            <Text style={[styles.markerText, styles.markerRight, { color: activeColor + 'cc', fontSize: 13 }]}>⟳</Text>
          </>
        )}

        {/* Center resting dot */}
        <View style={[styles.centerDot, { backgroundColor: activeColor + '55' }]} />

        {/* Movable thumb knob */}
        <View
          style={[
            styles.knob,
            {
              width: knobSize,
              height: knobSize,
              borderRadius: knobRadius,
              transform: [{ translateX: knobOffset.x }, { translateY: knobOffset.y }],
              backgroundColor: disabled ? '#3b4258' : activeColor,
              shadowColor: activeColor,
              shadowOpacity: isActive ? 0.9 : 0.4,
              shadowRadius: isActive ? 12 : 6,
              borderColor: '#ffffff55',
            },
          ]}
        >
          <View style={styles.knobInnerGrip} />
        </View>
      </View>

      {/* Label and Live readout badge */}
      <View style={styles.labelRow}>
        <Text style={[styles.axisLabel, { color: activeColor }]}>{label}</Text>
        {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  crosshairX: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#ffffff1a',
  },
  crosshairY: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#ffffff1a',
  },
  markerText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '900',
  },
  markerTop: {
    top: 6,
  },
  markerBottom: {
    bottom: 6,
  },
  markerLeft: {
    left: 8,
  },
  markerRight: {
    right: 8,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  knob: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  knobInnerGrip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0a0d14cc',
  },
  labelRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#a0a8c2',
    backgroundColor: '#0d101a99',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
});

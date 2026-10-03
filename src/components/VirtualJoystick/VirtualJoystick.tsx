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

  // Dynamic refs to avoid stale closures in PanResponder
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const radiusRef = useRef(radius);
  radiusRef.current = radius;

  const deadzoneRef = useRef(deadzone);
  deadzoneRef.current = deadzone;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onStartShouldSetPanResponderCapture: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponderCapture: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        if (disabledRef.current) return;
        setIsActive(true);
      },

      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (disabledRef.current) return;
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const currentRadius = radiusRef.current;

        const norm = normalizeJoystickInput(dx, dy, currentRadius, deadzoneRef.current);

        // Clamped visual knob position
        const dist = Math.hypot(dx, dy);
        const visualClampedDist = Math.min(dist, currentRadius);
        const angle = Math.atan2(dy, dx);

        const visualX = Math.cos(angle) * visualClampedDist;
        const visualY = Math.sin(angle) * visualClampedDist;

        setKnobOffset({ x: visualX, y: visualY });

        // Emit normalized values [-1.0, 1.0]
        onMoveRef.current(norm.x, norm.y);
      },

      onPanResponderRelease: () => {
        setIsActive(false);
        setKnobOffset({ x: 0, y: 0 });
        onReleaseRef.current();
      },

      onPanResponderTerminate: () => {
        setIsActive(false);
        setKnobOffset({ x: 0, y: 0 });
        onReleaseRef.current();
      },
    })
  ).current;

  const baseSize = radius * 2;
  const knobSize = knobRadius * 2;

  return (
    <View style={[styles.container, { width: baseSize, height: baseSize + 24 }]}>
      {/* Outer base track */}
      <View
        style={[
          styles.outerRing,
          {
            width: baseSize,
            height: baseSize,
            borderRadius: radius,
            borderColor: isActive ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.15)',
            backgroundColor: isActive ? 'rgba(24, 24, 27, 0.85)' : 'rgba(24, 24, 27, 0.65)',
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Subtle center deadzone marker */}
        <View pointerEvents="none" style={styles.centerDot} />

        {/* Movable thumb knob */}
        <View
          pointerEvents="none"
          style={[
            styles.knob,
            {
              width: knobSize,
              height: knobSize,
              borderRadius: knobRadius,
              transform: [{ translateX: knobOffset.x }, { translateY: knobOffset.y }],
              backgroundColor: disabled ? '#3f3f46' : isActive ? '#f4f4f5' : '#e4e4e7',
            },
          ]}
        >
          <View pointerEvents="none" style={styles.knobInnerGrip} />
        </View>
      </View>

      {/* Label and Live readout badge */}
      <View pointerEvents="none" style={styles.labelRow}>
        <Text style={styles.axisLabel}>{label}</Text>
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  knob: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  knobInnerGrip: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#71717a',
  },
  labelRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d4d4d8',
    letterSpacing: 0.4,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#a1a1aa',
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

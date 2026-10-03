/**
 * Asimov Controller - Telemetry HUD Panel
 * Displays structured robot state, pose, velocities, contacts, and safety faults.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RobotTelemetry } from '../../types/telemetry';
import { formatPosition, formatOrientation, formatVelocity } from '../../utils/formatting';

export interface TelemetryPanelProps {
  telemetry: RobotTelemetry;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => {
  const { mode, submode, base, contacts, faults, battery, online } = telemetry;

  const modeColors: Record<string, string> = {
    STAND: '#00e5ff',
    MOVE: '#00e676',
    DAMP: '#ffb300',
    FAULT: '#ff3366',
    ESTOP: '#ff1744',
    UNKNOWN: '#6e7798',
  };

  const currentModeColor = modeColors[mode] || '#6e7798';
  const hasFault = faults.latched || faults.errorFlags !== 0;

  return (
    <View style={styles.container}>
      {/* Row 1: Mode, Submode, Base Height, Contacts */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={[styles.modeBadge, { borderColor: currentModeColor }]}>
            <Text style={[styles.modeText, { color: currentModeColor }]}>
              {mode}
            </Text>
          </View>
          {submode !== 'NONE' && (
            <View style={styles.submodeBadge}>
              <Text style={styles.submodeText}>{submode}</Text>
            </View>
          )}
        </View>

        {/* Contacts */}
        <View style={styles.contactsGroup}>
          <Text style={styles.label}>FEET:</Text>
          <View style={[styles.contactDot, contacts.leftFoot && styles.contactDotActive]}>
            <Text style={styles.contactLabel}>L</Text>
          </View>
          <View style={[styles.contactDot, contacts.rightFoot && styles.contactDotActive]}>
            <Text style={styles.contactLabel}>R</Text>
          </View>
        </View>

        {/* Height */}
        <View style={styles.metricGroup}>
          <Text style={styles.label}>HEIGHT:</Text>
          <Text style={styles.metricValue}>{base.position.z.toFixed(2)}m</Text>
        </View>
      </View>

      {/* Row 2: Kinematics (Pose, Angles, Velocities) */}
      <View style={styles.dataGrid}>
        <View style={styles.dataCol}>
          <Text style={styles.dataLabel}>POSE</Text>
          <Text style={styles.dataValue} numberOfLines={1}>
            {formatPosition(base.position.x, base.position.y, base.position.z)}
          </Text>
        </View>

        <View style={styles.dataCol}>
          <Text style={styles.dataLabel}>ANGLES</Text>
          <Text style={styles.dataValue} numberOfLines={1}>
            {formatOrientation(base.orientation.rollDeg, base.orientation.pitchDeg, base.orientation.yawDeg)}
          </Text>
        </View>

        <View style={styles.dataCol}>
          <Text style={styles.dataLabel}>BODY VELOCITY</Text>
          <Text style={styles.dataValue} numberOfLines={1}>
            {formatVelocity(base.linearVelocityBody.x, base.linearVelocityBody.y, base.angularVelocityBody.z)}
          </Text>
        </View>
      </View>

      {/* Row 3: Faults / Battery / Status */}
      <View style={styles.footerRow}>
        <View style={styles.faultGroup}>
          <Text style={styles.label}>SAFETY:</Text>
          <Text
            style={[
              styles.faultText,
              hasFault ? styles.faultTextAlert : styles.faultTextNominal,
            ]}
            numberOfLines={1}
          >
            {!online
              ? 'SIMULATOR DISCONNECTED'
              : hasFault
              ? `FAULT: ${faults.reasons.join(', ')}`
              : 'SYSTEM NOMINAL'}
          </Text>
        </View>

        <View style={styles.battGroup}>
          <Text style={styles.label}>BATTERY:</Text>
          <Text style={styles.battValue}>{battery.socPercent.toFixed(0)}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0f17',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2434',
    padding: 10,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1e2d',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: '#0a0d14',
  },
  modeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  submodeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#1c2130',
  },
  submodeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8b94b0',
  },
  contactsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1f2334',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDotActive: {
    backgroundColor: '#00e676',
  },
  contactLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#080a10',
  },
  metricGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#656d8a',
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00e5ff',
  },
  dataGrid: {
    gap: 3,
  },
  dataCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#555c76',
    width: 80,
  },
  dataValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c7cbd9',
    fontFamily: 'monospace',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a1e2d',
  },
  faultGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  faultText: {
    fontSize: 9,
    fontWeight: '700',
  },
  faultTextNominal: {
    color: '#00e676',
  },
  faultTextAlert: {
    color: '#ff3366',
  },
  battGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  battValue: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00e676',
  },
});

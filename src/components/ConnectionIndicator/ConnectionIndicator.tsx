/**
 * Asimov Controller - Connection Indicator Pill & Control
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ConnectionState } from '../../types/connection';

export interface ConnectionIndicatorProps {
  state: ConnectionState;
  host: string;
  latencyMs: number;
  onPressToggle: () => void;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  state,
  host,
  latencyMs,
  onPressToggle,
}) => {
  const stateColor = {
    CONNECTED: '#00e676',
    CONNECTING: '#ffb300',
    RECONNECTING: '#ff9100',
    DISCONNECTED: '#757d9a',
    ERROR: '#ff3366',
  }[state];

  const isConnected = state === 'CONNECTED';

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: stateColor }]} />
        <View>
          <Text style={styles.statusText}>{state}</Text>
          <Text style={styles.hostText}>
            {host} {isConnected && latencyMs > 0 ? `• ${latencyMs}ms` : ''}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPressToggle}
        style={[
          styles.actionButton,
          isConnected ? styles.disconnectButton : styles.connectButton,
        ]}
      >
        <Text
          style={[
            styles.actionButtonText,
            isConnected ? styles.disconnectText : styles.connectText,
          ]}
        >
          {isConnected ? 'DISCONNECT' : 'CONNECT'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12141e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#232738',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#e2e6f3',
  },
  hostText: {
    fontSize: 9,
    color: '#6e7798',
    fontWeight: '500',
  },
  actionButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  connectButton: {
    backgroundColor: '#00e5ff18',
    borderColor: '#00e5ff',
  },
  disconnectButton: {
    backgroundColor: '#ff336618',
    borderColor: '#ff3366',
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  connectText: {
    color: '#00e5ff',
  },
  disconnectText: {
    color: '#ff3366',
  },
});

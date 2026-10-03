/**
 * Asimov Controller - Connect Screen (Cockpit Setup)
 * Landscape-optimized network configuration panel with quick presets.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ConnectionState, ConnectionConfig } from '../types/connection';
import { CONNECTION_PRESETS } from '../config';

export interface ConnectScreenProps {
  initialConfig: ConnectionConfig;
  connectionState: ConnectionState;
  lastError: string | null;
  onConnect: (config: Partial<ConnectionConfig>) => Promise<void>;
  onNavigateToController: () => void;
}

export const ConnectScreen: React.FC<ConnectScreenProps> = ({
  initialConfig,
  connectionState,
  lastError,
  onConnect,
  onNavigateToController,
}) => {
  const [host, setHost] = useState(initialConfig.host);
  const [httpPort, setHttpPort] = useState(String(initialConfig.httpPort));
  const [wsPort, setWsPort] = useState(String(initialConfig.wsPort));
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect({
        host: host.trim(),
        httpPort: parseInt(httpPort, 10) || 8852,
        wsPort: parseInt(wsPort, 10) || 8854,
      });
      onNavigateToController();
    } finally {
      setIsConnecting(false);
    }
  };

  const isConnected = connectionState === 'CONNECTED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cockpitRow}>
        {/* Left Column: Branding, Gateway Status, and Quick Presets */}
        <View style={styles.leftCol}>
          <View style={styles.header}>
            <Text style={styles.appTitle}>ASIMOV CONTROLLER</Text>
            <Text style={styles.appSubtitle}>Virtual Asimov 1 Mobile Control Interface</Text>
          </View>

          {/* Connection Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      connectionState === 'CONNECTED'
                        ? '#00e676'
                        : connectionState === 'CONNECTING'
                        ? '#ffb300'
                        : '#ff3366',
                  },
                ]}
              />
              <Text style={styles.statusTitle}>Gateway: {connectionState}</Text>
            </View>
            {lastError ? (
              <Text style={styles.errorText} numberOfLines={2}>
                {lastError}
              </Text>
            ) : null}
          </View>

          {/* Preset Buttons */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
            <View style={styles.presetsCol}>
              {CONNECTION_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.host}
                  style={[styles.presetButton, host === preset.host && styles.presetButtonActive]}
                  onPress={() => setHost(preset.host)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      host === preset.host && styles.presetButtonTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Right Column: Inputs, Actions, and Instructions */}
        <View style={styles.rightCol}>
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>NETWORK SETTINGS</Text>

            <Text style={styles.inputLabel}>Simulator Host IP / Hostname:</Text>
            <TextInput
              style={styles.input}
              value={host}
              onChangeText={setHost}
              placeholder="10.155.49.132 or 10.0.2.2"
              placeholderTextColor="#4a5168"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.portRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>HTTP Port (Video):</Text>
                <TextInput
                  style={styles.input}
                  value={httpPort}
                  onChangeText={setHttpPort}
                  keyboardType="numeric"
                  placeholder="8852"
                  placeholderTextColor="#4a5168"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>WebSocket (Telemetry):</Text>
                <TextInput
                  style={styles.input}
                  value={wsPort}
                  onChangeText={setWsPort}
                  keyboardType="numeric"
                  placeholder="8854"
                  placeholderTextColor="#4a5168"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.connectButton, isConnected && styles.connectedButton]}
            onPress={handleConnect}
            disabled={isConnecting}
            activeOpacity={0.8}
          >
            {isConnecting ? (
              <ActivityIndicator color="#0a0d16" />
            ) : (
              <Text style={styles.connectButtonText}>
                {isConnected ? 'ENTER CONTROLLER (ONLINE)' : 'CONNECT TO SIMULATOR'}
              </Text>
            )}
          </TouchableOpacity>

          {isConnected && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onNavigateToController}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Return to Live Game Viewport →</Text>
            </TouchableOpacity>
          )}

          {/* Connection Tip */}
          <View style={styles.infoCard}>
            <Text style={styles.infoBullet}>
              • Make sure phone & PC are on the same Wi-Fi. Start sim with{' '}
              <Text style={styles.cyan}>./run_sim.sh --web</Text>
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  cockpitRow: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1,
    gap: 12,
  },
  rightCol: {
    flex: 1.1,
    gap: 10,
  },
  header: {
    marginTop: 4,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#00e5ff',
  },
  appSubtitle: {
    fontSize: 10,
    color: '#6e7798',
    marginTop: 2,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#101422',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#21273a',
    padding: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e2e6f3',
  },
  errorText: {
    fontSize: 10,
    color: '#ff3366',
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    gap: 6,
  },
  inputSection: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#656d8a',
  },
  presetsCol: {
    gap: 6,
  },
  presetButton: {
    backgroundColor: '#111524',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#232a40',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  presetButtonActive: {
    borderColor: '#00e5ff',
    backgroundColor: '#00e5ff16',
  },
  presetButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b94b0',
  },
  presetButtonTextActive: {
    color: '#00e5ff',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b94b0',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#101422',
    borderWidth: 1,
    borderColor: '#232a40',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#e2e6f3',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  portRow: {
    flexDirection: 'row',
    gap: 10,
  },
  connectButton: {
    backgroundColor: '#00e5ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    elevation: 4,
    shadowColor: '#00e5ff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  connectedButton: {
    backgroundColor: '#00e676',
    shadowColor: '#00e676',
  },
  connectButtonText: {
    color: '#080a10',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipButtonText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#0e111c',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1d2232',
    padding: 8,
  },
  infoBullet: {
    fontSize: 9,
    color: '#656d8a',
    lineHeight: 14,
  },
  cyan: {
    color: '#00e5ff',
    fontFamily: 'monospace',
  },
});

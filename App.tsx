/**
 * Asimov Controller - Application Root
 * Landscape mobile gaming interface with full-screen camera integration.
 */

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useRobotStore } from './src/state/useRobotStore';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { ControllerScreen } from './src/screens/ControllerScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'connect' | 'controller'>('connect');
  const store = useRobotStore();

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {currentScreen === 'connect' ? (
        <ConnectScreen
          initialConfig={store.config}
          connectionState={store.connectionState}
          lastError={store.lastError}
          onConnect={store.connect}
          onNavigateToController={() => setCurrentScreen('controller')}
        />
      ) : (
        <ControllerScreen
          store={store}
          onNavigateToConnect={() => setCurrentScreen('connect')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070c',
  },
});

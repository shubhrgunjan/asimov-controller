/**
 * Asimov Controller - Camera Viewpoint Selector
 * Controls switching between First Person (Eye-level), Third Person (Chase), and Second Person (Front Overview).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraMode, CAMERA_DEFINITIONS } from '../../types/camera';

export interface CameraSelectorProps {
  currentMode: CameraMode;
  onSelect: (mode: CameraMode) => void;
  disabled?: boolean;
}

export const CameraSelector: React.FC<CameraSelectorProps> = ({
  currentMode,
  onSelect,
  disabled = false,
}) => {
  const modes: CameraMode[] = ['FIRST', 'THIRD', 'SECOND'];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>CAMERA VIEW</Text>
      <View style={styles.selectorRow}>
        {modes.map((mode) => {
          const isSelected = currentMode === mode;
          const def = CAMERA_DEFINITIONS[mode];

          return (
            <TouchableOpacity
              key={mode}
              activeOpacity={0.7}
              disabled={disabled}
              onPress={() => onSelect(mode)}
              style={[
                styles.modeButton,
                isSelected && styles.modeButtonActive,
                disabled && styles.modeButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  isSelected && styles.modeButtonTextActive,
                  disabled && styles.modeButtonTextDisabled,
                ]}
              >
                {mode}
              </Text>
              <Text
                style={[
                  styles.subText,
                  isSelected && styles.subTextActive,
                ]}
                numberOfLines={1}
              >
                {mode === 'FIRST' ? 'Head FPV' : mode === 'THIRD' ? 'Chase' : 'Front'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#656d8a',
    marginBottom: 4,
  },
  selectorRow: {
    flexDirection: 'row',
    backgroundColor: '#12141e',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#232738',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#00e5ff20',
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  modeButtonDisabled: {
    opacity: 0.4,
  },
  modeButtonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8b93b0',
  },
  modeButtonTextActive: {
    color: '#00e5ff',
  },
  modeButtonTextDisabled: {
    color: '#474c63',
  },
  subText: {
    fontSize: 8,
    color: '#525a75',
    marginTop: 1,
    fontWeight: '500',
  },
  subTextActive: {
    color: '#00e5ffbb',
  },
});

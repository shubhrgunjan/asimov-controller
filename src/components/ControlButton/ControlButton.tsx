/**
 * Asimov Controller - Gamepad Action Button Component
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';

export type ButtonVariant = 'primary' | 'warning' | 'danger' | 'success' | 'neutral';

export interface ControlButtonProps {
  title: string;
  subtitle?: string;
  variant?: ButtonVariant;
  onPress: () => void | Promise<any>;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  title,
  subtitle,
  variant = 'neutral',
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const colorMap = {
    primary: {
      bg: '#00e5ff18',
      border: '#00e5ff',
      text: '#00e5ff',
    },
    warning: {
      bg: '#ffb30018',
      border: '#ffb300',
      text: '#ffb300',
    },
    danger: {
      bg: '#ff336618',
      border: '#ff3366',
      text: '#ff3366',
    },
    success: {
      bg: '#00e67618',
      border: '#00e676',
      text: '#00e676',
    },
    neutral: {
      bg: '#252836',
      border: '#3b4058',
      text: '#c7cbd9',
    },
  };

  const colors = disabled
    ? { bg: '#161822', border: '#252836', text: '#505670' }
    : colorMap[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.text + 'aa' }]}>
              {subtitle}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

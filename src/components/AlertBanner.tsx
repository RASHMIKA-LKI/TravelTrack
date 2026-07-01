// src/components/AlertBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  message: string;
  type: 'danger' | 'warning' | 'success';
}

const bannerColors = {
  danger:  '#D32F2F',
  warning: '#FFC107',
  success: '#4CAF50',
};

const bannerIcons = {
  danger:  '🆘 ',
  warning: '⚠️ ',
  success: '✅ ',
};

/**
 * An inline banner that can be placed at the top of a screen to show
 * danger (red), warning (amber), or success (green) messages.
 *
 * Usage:
 *   <AlertBanner message="John is out of range!" type="danger" />
 */
export function AlertBanner({ message, type }: Props) {
  return (
    <View style={[styles.banner, { backgroundColor: bannerColors[type] }]}>
      <Text style={styles.text}>
        {bannerIcons[type]}
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

interface Props {
  size?: number;
}

export default function BrandMark({ size = 34 }: Props) {
  return (
    <LinearGradient
      colors={[COLORS.brand, COLORS.lavender]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.34 }]}
    >
      <Ionicons name="sparkles" size={size * 0.52} color={COLORS.white} />
      <View style={[styles.dot, { width: size * 0.16, height: size * 0.16 }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 6,
    top: 6,
    borderRadius: 999,
    backgroundColor: COLORS.lime,
  },
});

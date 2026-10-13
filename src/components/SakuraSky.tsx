import React from 'react';
import { Image, StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FallingSakura from './FallingSakura';

export default function SakuraSky({
  petals = 22,
  dim = 0.18,
}: {
  petals?: number;
  dim?: number;
}) {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        Platform.OS === 'web' ? { pointerEvents: 'none' as const } : undefined,
      ]}
      pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
    >
      <Image
        source={require('../../assets/sakura-sky.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[`rgba(255,245,248,${dim * 0.35})`, 'transparent', `rgba(255,245,248,${dim * 0.2})`]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <FallingSakura count={petals} />
    </View>
  );
}

import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import SakuraSky from './SakuraSky';

export default function AuthAtmosphere() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} pointerEvents="none">
      <SakuraSky petals={Platform.OS === 'web' ? 26 : 30} dim={0.1} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 0,
    ...Platform.select({
      web: { pointerEvents: 'none' as const },
      default: {},
    }),
  },
});

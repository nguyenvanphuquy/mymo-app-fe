import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export function ensureModelViewerLoaded(): void {
  // Native map uses a lightweight model marker; full GLB viewing is available on web.
}

export default function Model3DViewer({
  style,
}: {
  src: string;
  style?: StyleProp<ViewStyle>;
  cameraControls?: boolean;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="cube-outline" size={34} color={Colors.primary} />
      <Text style={styles.text}>Mô hình 3D đã được chọn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBEAF9',
  },
  text: {
    marginTop: 6,
    color: Colors.primaryDark,
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
  },
});

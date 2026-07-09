import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface MapLocateButtonProps {
  onPress: () => void;
  accent: readonly [string, string];
  glowColor: string;
}

export default function MapLocateButton({ onPress, accent, glowColor }: MapLocateButtonProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.wrap, { shadowColor: glowColor }]}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: glowColor,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <LinearGradient colors={[...accent]} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name="locate" size={20} color={Colors.white} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  ring: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
});

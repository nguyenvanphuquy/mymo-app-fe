import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/colors';

interface ToggleProps {
  on: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function Toggle({ on, onPress, disabled = false }: ToggleProps) {
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: on ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [on]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 26] });
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.primarySoft, Colors.primary],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.track, disabled && styles.disabled]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.bg, { backgroundColor: bgColor }]} />
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bg: {
    borderRadius: 14,
  },
  thumb: Platform.select({
    web: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: Colors.white,
      boxShadow: '0 2px 4px rgba(124, 91, 255, 0.3)',
    },
    default: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: Colors.white,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
  }),
  disabled: {
    opacity: 0.4,
  },
});

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SparkleField from './SparkleField';

const ORBS = [
  { top: '4%', right: '-8%', size: 160, color: 'rgba(200, 170, 255, 0.35)' },
  { top: '28%', left: '-12%', size: 140, color: 'rgba(255, 200, 230, 0.28)' },
  { top: '52%', right: '2%', size: 100, color: 'rgba(180, 220, 255, 0.22)' },
  { top: '72%', left: '8%', size: 120, color: 'rgba(255, 230, 180, 0.2)' },
] as const;

export default function HomeAtmosphere() {
  const shimmer = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const shimmerAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 3800, useNativeDriver }),
        Animated.timing(shimmer, { toValue: 0, duration: 3800, useNativeDriver }),
      ]),
    );
    const driftAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 6000, useNativeDriver }),
        Animated.timing(drift, { toValue: 0, duration: 6000, useNativeDriver }),
      ]),
    );
    shimmerAnim.start();
    driftAnim.start();
    return () => {
      shimmerAnim.stop();
      driftAnim.stop();
    };
  }, [shimmer, drift]);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.03, 0.12, 0.03],
  });

  const driftY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} pointerEvents="none">
      <LinearGradient
        colors={['#F8F0FF', '#FFF5FA', '#F5F8FF', '#FFFBF5']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: driftY }] }]}>
        {ORBS.map((orb, index) => (
          <View
            key={index}
            style={[
              styles.orb,
              {
                top: orb.top,
                left: 'left' in orb ? orb.left : undefined,
                right: 'right' in orb ? orb.right : undefined,
                width: orb.size,
                height: orb.size,
                borderRadius: orb.size / 2,
                backgroundColor: orb.color,
              },
            ]}
          />
        ))}
      </Animated.View>

      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'transparent', 'rgba(232, 216, 255, 0.15)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shimmerOpacity }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.45)', 'rgba(210, 180, 255, 0.2)', 'rgba(255, 220, 250, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SparkleField count={28} size={8} color="#E0C8FF" accentColor="#FFFFFF" intense />
      <SparkleField count={14} size={13} color="#FFD8F0" accentColor="#FFFFFF" intense />
      <SparkleField count={8} size={16} color="#B8E8FF" accentColor="#FFFFFF" intense />
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
  orb: {
    position: 'absolute',
    opacity: 0.7,
    ...Platform.select({
      web: { filter: 'blur(40px)' as any },
      default: {},
    }),
  },
});

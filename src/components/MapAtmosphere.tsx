import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SparkleField from './SparkleField';
import { MAP_THEME_UI, type MapTheme } from '../utils/mapStyles';

interface MapAtmosphereProps {
  theme: MapTheme;
}

export default function MapAtmosphere({ theme }: MapAtmosphereProps) {
  const ui = MAP_THEME_UI[theme];
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 4200, useNativeDriver }),
        Animated.timing(shimmer, { toValue: 0, duration: 4200, useNativeDriver }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.02, 0.08, 0.02],
  });

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.wrap]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[...ui.atmosphere]}
        locations={[0, 0.42, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)', 'transparent']}
        locations={[0, 0.25, 0.7]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {ui.orbs.map((orb, index) => (
        <View
          key={index}
          style={[
            styles.orb,
            {
              top: orb.top,
              left: orb.left,
              right: orb.right,
              width: orb.size,
              height: orb.size,
              borderRadius: orb.size / 2,
              backgroundColor: orb.color,
            },
          ]}
        />
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shimmerOpacity }]}>
        <LinearGradient
          colors={[...ui.shimmer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SparkleField
        count={Platform.OS === 'web' ? 6 : 10}
        size={7}
        color={ui.sparkle}
        accentColor={ui.sparkleAccent}
      />
      <SparkleField
        count={Platform.OS === 'web' ? 3 : 5}
        size={11}
        color={ui.sparkleAccent}
        accentColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 1,
    ...Platform.select({
      web: { pointerEvents: 'none' as const },
      default: {},
    }),
  },
  orb: {
    position: 'absolute',
    opacity: 0.38,
    ...Platform.select({
      web: {},
      default: {},
    }),
  },
});

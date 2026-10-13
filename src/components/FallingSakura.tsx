import React, { useEffect, useMemo, useRef, memo } from 'react';
import { View, StyleSheet, Animated, Platform, Dimensions, Easing } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
const PETAL_COLORS = ['#F8D7E2', '#FADDE8', '#FFF1F4', '#F4C9D6', '#FFE8EF'] as const;

type PetalSpec = {
  left: number;
  width: number;
  height: number;
  duration: number;
  delay: number;
  sway: number;
  color: string;
  opacity: number;
};

function makePetals(count: number): PetalSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    left: ((i * 37 + 9) % 96) + (i % 3) * 1.2,
    width: 7 + ((i * 3) % 6),
    height: 11 + ((i * 4) % 8),
    duration: 10000 + ((i * 1400) % 9000),
    delay: (i * 380) % 4800,
    sway: 12 + ((i * 7) % 20),
    color: PETAL_COLORS[i % PETAL_COLORS.length],
    opacity: 0.55 + ((i % 4) * 0.1),
  }));
}

function FallingPetal({ spec }: { spec: PetalSpec }) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const fallAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(fall, {
          toValue: 1,
          duration: spec.duration,
          easing: Easing.linear,
          useNativeDriver,
        }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver }),
      ]),
    );
    const swayAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 2200 + spec.delay * 0.12,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: 2200 + spec.delay * 0.12,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );
    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4200 + spec.delay * 0.2,
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    fallAnim.start();
    swayAnim.start();
    spinAnim.start();
    return () => {
      fallAnim.stop();
      swayAnim.stop();
      spinAnim.stop();
    };
  }, [fall, sway, spin, spec.delay, spec.duration]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_H + 70],
  });
  const translateX = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-spec.sway, spec.sway],
  });
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const rotateY = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-35deg', '35deg'],
  });

  return (
    <Animated.View
      style={[
        styles.petalWrap,
        {
          left: `${spec.left}%`,
          opacity: spec.opacity,
          transform: [{ translateY }, { translateX }, { rotate }, { rotateY }],
        },
      ]}
    >
      <View
        style={[
          styles.petal,
          {
            width: spec.width,
            height: spec.height,
            backgroundColor: spec.color,
          },
        ]}
      />
    </Animated.View>
  );
}

const MemoPetal = memo(FallingPetal);

export default function FallingSakura({ count = 22 }: { count?: number }) {
  const petals = useMemo(() => makePetals(count), [count]);

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        Platform.OS === 'web' ? { pointerEvents: 'none' as const } : undefined,
      ]}
      pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
    >
      {petals.map((spec, index) => (
        <MemoPetal key={index} spec={spec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  petalWrap: {
    position: 'absolute',
    top: 0,
  },
  petal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});

import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Colors } from '../constants/colors';

interface SparkleFieldProps {
  count?: number;
  size?: number;
}

export default function SparkleField({ count = 10, size = 10 }: SparkleFieldProps) {
  const stars = Array.from({ length: count }, (_, i) => {
    const x = (i * 53) % 100;
    const y = (i * 37) % 100;
    const d = (i % 5) * 400;
    const s = size + ((i * 3) % 8);
    return { x, y, d, s };
  });

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        Platform.OS === 'web' ? { pointerEvents: 'none' as const } : undefined,
      ]}
      pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
    >
      {stars.map((p, i) => (
        <SparkleItem key={i} x={p.x} y={p.y} delay={p.d} size={p.s} />
      ))}
    </View>
  );
}

function SparkleItem({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver }),
        Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        fontSize: size,
        opacity,
        color: Colors.primaryLight,
      }}
    >
      ✦
    </Animated.Text>
  );
}

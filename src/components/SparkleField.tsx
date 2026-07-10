import React, { useEffect, useMemo, useRef, memo } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Colors } from '../constants/colors';

const GLYPHS = ['✦', '✨', '⋆', '·'] as const;

interface SparkleFieldProps {
  count?: number;
  size?: number;
  color?: string;
  accentColor?: string;
  intense?: boolean;
}

function SparkleField({
  count = 10,
  size = 10,
  color = Colors.primaryLight,
  accentColor,
  intense = false,
}: SparkleFieldProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const x = (i * 47 + 11) % 96;
        const y = (i * 31 + 7) % 94;
        const d = (i % 6) * 320;
        const s = size + ((i * 5) % (intense ? 8 : 5));
        const glyph = GLYPHS[i % GLYPHS.length];
        const tone = i % 3 === 0 ? (accentColor || '#FFFFFF') : color;
        return { x, y, d, s, glyph, tone };
      }),
    [count, size, color, accentColor, intense],
  );

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        Platform.OS === 'web' ? { pointerEvents: 'none' as const } : undefined,
      ]}
      pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
    >
      {stars.map((p, i) => (
        <SparkleItem
          key={i}
          x={p.x}
          y={p.y}
          delay={p.d}
          size={p.s}
          color={p.tone}
          glyph={p.glyph}
          intense={intense}
        />
      ))}
    </View>
  );
}

const SparkleItem = memo(function SparkleItem({
  x, y, delay, size, color, glyph, intense,
}: {
  x: number;
  y: number;
  delay: number;
  size: number;
  color: string;
  glyph: string;
  intense: boolean;
}) {
  const opacity = useRef(new Animated.Value(0.2)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    // Slower, cheaper loops — less JS work per second
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: intense ? 0.9 : 0.7,
            duration: intense ? 900 : 1400,
            useNativeDriver,
          }),
          Animated.timing(scale, {
            toValue: intense ? 1.15 : 1.06,
            duration: intense ? 900 : 1400,
            useNativeDriver,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.15,
            duration: intense ? 1100 : 1600,
            useNativeDriver,
          }),
          Animated.timing(scale, {
            toValue: 0.85,
            duration: intense ? 1100 : 1600,
            useNativeDriver,
          }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, intense, opacity, scale]);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        fontSize: size,
        opacity,
        color,
        transform: [{ scale }],
      }}
    >
      {glyph}
    </Animated.Text>
  );
});

export default memo(SparkleField);

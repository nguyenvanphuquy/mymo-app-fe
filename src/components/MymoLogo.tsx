import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';

const LOGO_COLOR = '#6A3BAF';
const ASPECT = 1024 / 271;

const LEFT_EYE = { cx: 0.3475, cy: 0.228 };
const RIGHT_EYE = { cx: 0.4194, cy: 0.29 };

/** Soft ease — slow in, slow out, no hard edges. */
const soft = Easing.bezier(0.4, 0.0, 0.2, 1);
const softInOut = Easing.bezier(0.45, 0.05, 0.25, 1);
const softOut = Easing.bezier(0.22, 1, 0.36, 1);

type Props = {
  width: number;
  style?: StyleProp<ViewStyle>;
  height?: number;
  animated?: boolean;
};

type EyeMotion = {
  open: Animated.Value;
  lid: Animated.Value;
  lookX: Animated.Value;
  lookY: Animated.Value;
  squash: Animated.Value;
};

function CircleEye({
  size, color, motion,
}: { size: number; color: string; motion: EyeMotion }) {
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [
          { translateX: motion.lookX },
          { translateY: motion.lookY },
          { scaleX: motion.squash },
          { scaleY: motion.open },
        ],
      }}
    />
  );
}

function WinkEye({
  size, color, motion,
}: { size: number; color: string; motion: EyeMotion }) {
  const stroke = Math.max(2, size * 0.26);
  const arm = size * 0.6;
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [
          { translateX: motion.lookX },
          { translateY: motion.lookY },
          { scaleX: motion.squash },
          { scaleY: motion.open },
        ],
      }}
    >
      <View
        style={{
          width: arm,
          height: arm,
          borderRightWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
          marginTop: -size * 0.05,
        }}
      />
    </Animated.View>
  );
}

function ClosedLid({
  size, color, opacity,
}: { size: number; color: string; opacity: Animated.Value }) {
  const lidW = size * 0.82;
  const lidH = Math.max(2, size * 0.16);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (size - lidW) / 2,
        top: (size - lidH) / 2,
        width: lidW,
        height: lidH,
        borderRadius: 99,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

function animTo(
  value: Animated.Value,
  toValue: number,
  duration: number,
  easing = soft,
) {
  return Animated.timing(value, {
    toValue,
    duration,
    easing,
    useNativeDriver: true,
  });
}

export default function MymoLogo({ width, height, style, animated = true }: Props) {
  const h = height ?? width / ASPECT;
  const eyeSize = Math.max(5, h * 0.2);

  const floatY = useRef(new Animated.Value(0)).current;
  const floatX = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;

  const leftMotion: EyeMotion = {
    open: useRef(new Animated.Value(1)).current,
    lid: useRef(new Animated.Value(0)).current,
    lookX: useRef(new Animated.Value(0)).current,
    lookY: useRef(new Animated.Value(0)).current,
    squash: useRef(new Animated.Value(1)).current,
  };
  const rightMotion: EyeMotion = {
    open: useRef(new Animated.Value(1)).current,
    lid: useRef(new Animated.Value(0)).current,
    lookX: useRef(new Animated.Value(0)).current,
    lookY: useRef(new Animated.Value(0)).current,
    squash: useRef(new Animated.Value(1)).current,
  };

  const leftIsWink = useRef(new Animated.Value(0)).current;
  const leftCircleOpacity = useRef(new Animated.Value(1)).current;
  const rightIsWink = useRef(new Animated.Value(1)).current;
  const rightCircleOpacity = useRef(new Animated.Value(0)).current;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelled = useRef(false);
  const bodyLoops = useRef<Animated.CompositeAnimation[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = setTimeout(() => resolve(), ms);
      timers.current.push(id);
    });

  const blinkEye = (motion: EyeMotion, closeMs = 140, openMs = 220, holdMs = 40) =>
    new Promise<void>((resolve) => {
      Animated.sequence([
        Animated.parallel([
          animTo(motion.open, 0.12, closeMs, softInOut),
          animTo(motion.squash, 1.12, closeMs, softInOut),
          animTo(motion.lid, 1, closeMs, softInOut),
        ]),
        Animated.delay(holdMs),
        Animated.parallel([
          animTo(motion.open, 1, openMs, softOut),
          animTo(motion.squash, 1, openMs, softOut),
          animTo(motion.lid, 0, openMs, softOut),
        ]),
      ]).start(() => resolve());
    });

  const softBlinkBoth = async (stagger = 35) => {
    const left = blinkEye(leftMotion, 150, 240, 50);
    await wait(stagger);
    if (cancelled.current) return;
    await Promise.all([left, blinkEye(rightMotion, 160, 250, 45)]);
  };

  const setWinkMode = (leftWink: boolean, rightWink: boolean) =>
    new Promise<void>((resolve) => {
      Animated.parallel([
        animTo(leftIsWink, leftWink ? 1 : 0, 420, soft),
        animTo(leftCircleOpacity, leftWink ? 0 : 1, 420, soft),
        animTo(rightIsWink, rightWink ? 1 : 0, 420, soft),
        animTo(rightCircleOpacity, rightWink ? 0 : 1, 420, soft),
      ]).start(() => resolve());
    });

  const glance = (x: number, y = 0, ms = 520) =>
    new Promise<void>((resolve) => {
      Animated.parallel([
        animTo(leftMotion.lookX, x, ms, soft),
        animTo(rightMotion.lookX, x * 0.92, ms, soft),
        animTo(leftMotion.lookY, y, ms, soft),
        animTo(rightMotion.lookY, y * 0.9, ms, soft),
      ]).start(() => resolve());
    });

  useEffect(() => {
    if (!animated) return undefined;
    cancelled.current = false;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          animTo(floatY, -1.2, 2600, softInOut),
          animTo(floatX, 0.6, 2600, softInOut),
          animTo(tilt, 0.4, 2600, softInOut),
        ]),
        Animated.parallel([
          animTo(floatY, 1.0, 2800, softInOut),
          animTo(floatX, -0.5, 2800, softInOut),
          animTo(tilt, -0.35, 2800, softInOut),
        ]),
        Animated.parallel([
          animTo(floatY, -0.4, 2400, softInOut),
          animTo(floatX, 0.25, 2400, softInOut),
          animTo(tilt, 0.15, 2400, softInOut),
        ]),
      ]),
    );

    const breatheLoop = Animated.loop(
      Animated.sequence([
        animTo(breathe, 1.018, 3200, softInOut),
        animTo(breathe, 0.988, 3400, softInOut),
      ]),
    );

    floatLoop.start();
    breatheLoop.start();
    bodyLoops.current = [floatLoop, breatheLoop];

    const run = async () => {
      await setWinkMode(false, true);
      await wait(900);

      while (!cancelled.current) {
        // Longer, calmer pauses between gestures
        await wait(2400 + Math.random() * 2200);
        if (cancelled.current) break;

        const roll = Math.random();

        if (roll < 0.38) {
          await softBlinkBoth(40 + Math.random() * 40);
        } else if (roll < 0.55) {
          await softBlinkBoth(30);
          await wait(160 + Math.random() * 80);
          if (cancelled.current) break;
          await softBlinkBoth(50);
        } else if (roll < 0.72) {
          // Soft single wink on the open eye
          await blinkEye(leftMotion, 160, 280, 60);
        } else if (roll < 0.88) {
          // Gentle glance, pause, blink, return
          const dir = Math.random() > 0.5 ? 1 : -1;
          await glance(eyeSize * 0.22 * dir, eyeSize * 0.06 * (Math.random() > 0.5 ? 1 : -1), 560);
          await wait(420 + Math.random() * 280);
          if (cancelled.current) break;
          await softBlinkBoth(45);
          await wait(200);
          await glance(0, 0, 640);
        } else {
          // Slow wink-side swap
          await setWinkMode(true, false);
          await wait(1100 + Math.random() * 500);
          if (cancelled.current) break;
          await blinkEye(rightMotion, 150, 260, 50);
          await wait(800);
          await setWinkMode(false, true);
        }
      }
    };
    run();

    return () => {
      cancelled.current = true;
      clearTimers();
      bodyLoops.current.forEach((loop) => loop.stop());
      floatY.stopAnimation();
      floatX.stopAnimation();
      breathe.stopAnimation();
      tilt.stopAnimation();
    };
  }, [animated, eyeSize]);

  const triggerPlayful = () => {
    if (!animated) return;
    (async () => {
      await softBlinkBoth(40);
      await wait(120);
      await blinkEye(leftMotion, 140, 240, 50);
    })();
  };

  const leftStyle = {
    position: 'absolute' as const,
    left: LEFT_EYE.cx * width - eyeSize / 2,
    top: LEFT_EYE.cy * h - eyeSize / 2,
    width: eyeSize,
    height: eyeSize,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  const rightStyle = {
    position: 'absolute' as const,
    left: RIGHT_EYE.cx * width - eyeSize / 2,
    top: RIGHT_EYE.cy * h - eyeSize / 2,
    width: eyeSize,
    height: eyeSize,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const content = (
    <Animated.View
      style={[
        { width, height: h },
        style,
        {
          transform: [
            { translateX: floatX },
            { translateY: floatY },
            { scale: breathe },
            {
              rotate: tilt.interpolate({
                inputRange: [-1, 1],
                outputRange: ['-1deg', '1deg'],
              }),
            },
          ],
        },
      ]}
    >
      <Image
        source={require('../../assets/logo-base.png')}
        style={{ width, height: h } as ImageStyle}
        resizeMode="contain"
      />

      <View style={leftStyle} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: leftCircleOpacity, alignItems: 'center', justifyContent: 'center' }]}>
          <CircleEye size={eyeSize * 0.72} color={LOGO_COLOR} motion={leftMotion} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: leftIsWink, alignItems: 'center', justifyContent: 'center' }]}>
          <WinkEye size={eyeSize} color={LOGO_COLOR} motion={leftMotion} />
        </Animated.View>
        <ClosedLid size={eyeSize} color={LOGO_COLOR} opacity={leftMotion.lid} />
      </View>

      <View style={rightStyle} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: rightCircleOpacity, alignItems: 'center', justifyContent: 'center' }]}>
          <CircleEye size={eyeSize * 0.72} color={LOGO_COLOR} motion={rightMotion} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: rightIsWink, alignItems: 'center', justifyContent: 'center' }]}>
          <WinkEye size={eyeSize * 1.05} color={LOGO_COLOR} motion={rightMotion} />
        </Animated.View>
        <ClosedLid size={eyeSize} color={LOGO_COLOR} opacity={rightMotion.lid} />
      </View>
    </Animated.View>
  );

  if (!animated) return content;

  return (
    <Pressable onPress={triggerPlayful} accessibilityRole="image" accessibilityLabel="MYMO">
      {content}
    </Pressable>
  );
}

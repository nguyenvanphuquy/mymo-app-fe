import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  Easing,
  Pressable,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LOGO_PNG = require('../../assets/logo-pink.png');
const ASPECT   = 798 / 207;

const RIGHT_EYE = { cx: 0.451, cy: 0.280 };

const LID_COLOR = '#E090D4';

const soft      = Easing.bezier(0.4, 0.0, 0.2, 1);
const softOut   = Easing.bezier(0.22, 1, 0.36, 1);
const softInOut = Easing.bezier(0.45, 0.05, 0.25, 1);

type Props = {
  width: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
};

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
    useNativeDriver: Platform.OS !== 'web',
  });
}

function Eyelid({
  size,
  lidProgress,
  color,
}: {
  size: number;
  lidProgress: Animated.Value;
  color: string;
}) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scaleY: lidProgress }],
        opacity: 1,
      }}
      pointerEvents="none"
    />
  );
}

export default function MymoLogo({
  width,
  height,
  style,
  animated = true,
}: Props) {
  const h = height ?? width / ASPECT;

  const winkW   = width * 0.058;
  const winkH   = width * 0.034;

  const floatY  = useRef(new Animated.Value(0)).current;
  const floatX  = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt    = useRef(new Animated.Value(0)).current;

  const rightLid = useRef(new Animated.Value(0)).current;
  const shineX   = useRef(new Animated.Value(0)).current;

  const loops    = useRef<Animated.CompositeAnimation[]>([]);
  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelled = useRef(false);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = setTimeout(() => resolve(), ms);
      timers.current.push(id);
    });

  const blink = (
    lid: Animated.Value,
    closeMs = 140,
    holdMs  = 40,
    openMs  = 220,
  ) =>
    new Promise<void>((resolve) => {
      Animated.sequence([
        animTo(lid, 1, closeMs, soft),
        Animated.delay(holdMs),
        animTo(lid, 0, openMs, softOut),
      ]).start(() => resolve());
    });

  const blinkWink = () => blink(rightLid, 150, 50, 240);

  useEffect(() => {
    if (!animated) return undefined;
    cancelled.current = false;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          animTo(floatY, -1.2, 2600, softInOut),
          animTo(floatX,  0.6, 2600, softInOut),
          animTo(tilt,    0.4, 2600, softInOut),
        ]),
        Animated.parallel([
          animTo(floatY,  1.0, 2800, softInOut),
          animTo(floatX, -0.5, 2800, softInOut),
          animTo(tilt,  -0.35, 2800, softInOut),
        ]),
        Animated.parallel([
          animTo(floatY, -0.4, 2400, softInOut),
          animTo(floatX, 0.25, 2400, softInOut),
          animTo(tilt,   0.15, 2400, softInOut),
        ]),
      ]),
    );

    const breatheLoop = Animated.loop(
      Animated.sequence([
        animTo(breathe, 1.018, 3200, softInOut),
        animTo(breathe, 0.988, 3400, softInOut),
      ]),
    );

    const shineLoop = Animated.loop(
      Animated.sequence([
        animTo(shineX, 1, 1700, softInOut),
        Animated.delay(2600),
        animTo(shineX, 0, 1, soft),
      ]),
    );

    floatLoop.start();
    breatheLoop.start();
    shineLoop.start();
    loops.current = [floatLoop, breatheLoop, shineLoop];

    const run = async () => {
      await wait(1200);

      while (!cancelled.current) {
        await wait(2200 + Math.random() * 2800);
        if (cancelled.current) break;
        await blinkWink();
        if (Math.random() < 0.28) {
          await wait(140);
          if (cancelled.current) break;
          await blinkWink();
        }
      }
    };
    run();

    return () => {
      cancelled.current = true;
      clearTimers();
      loops.current.forEach((l) => l.stop());
      [floatY, floatX, breathe, tilt, rightLid, shineX].forEach(
        (v) => v.stopAnimation(),
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  const rightEyeStyle = {
    position: 'absolute' as const,
    left:     RIGHT_EYE.cx * width - winkW / 2,
    top:      RIGHT_EYE.cy * h     - winkH / 2,
    width:    winkW,
    height:   winkH,
    overflow: 'hidden' as const,
    borderRadius: winkH / 2,
  };

  const content = (
    <Animated.View
      style={[
        { width, height: h, backgroundColor: 'transparent', overflow: 'visible' },
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
      <View style={{ width, height: h, overflow: 'hidden', backgroundColor: 'transparent' }}>
        <Image
          source={LOGO_PNG}
          style={{ width, height: h, backgroundColor: 'transparent' }}
          resizeMode="contain"
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -h * 0.2,
            bottom: -h * 0.2,
            width: width * 0.28,
            opacity: 0.7,
            transform: [
              {
                translateX: shineX.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width * 0.4, width * 1.05],
                }),
              },
              { rotate: '18deg' },
            ],
          }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>

      <View style={rightEyeStyle} pointerEvents="none">
        <Eyelid size={winkH} lidProgress={rightLid} color={LID_COLOR} />
      </View>
    </Animated.View>
  );

  if (!animated) return content;

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel="MYMO"
      style={{ backgroundColor: 'transparent' }}
      onPress={() => {
        void blinkWink();
      }}
    >
      {content}
    </Pressable>
  );
}

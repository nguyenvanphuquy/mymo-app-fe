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

// logo.png: 1024 x 271px
const LOGO_PNG = require('../../assets/logo.png');
const ASPECT   = 1024 / 271; // ≈ 3.778

// Eye positions as fraction of (width, height) — measured from logo.png
// Left eye  = dot circle  (inside the "y" smiley)
// Right eye = wink chevron < (inside the "y" smiley)
const LEFT_EYE  = { cx: 0.3475, cy: 0.228 };
const RIGHT_EYE = { cx: 0.4194, cy: 0.29  };

// Eyelid colour matching the purple logo fill
const LID_COLOR = '#6A3BAF';

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

/** Circular eyelid that sweeps down over the eye (scaleY 0→1) */
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

/** Pill-shaped wink cover that hides the < chevron when the eye is "open" */
function WinkLid({
  width: w,
  height: h,
  opacity,
  color,
}: {
  width: number;
  height: number;
  opacity: Animated.Value;
  color: string;
}) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: h * 0.32,
        left: 0,
        width: w,
        height: h * 0.30,
        borderRadius: h * 0.15,
        backgroundColor: color,
        opacity,
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

  // Eye overlay sizes (tuned for logo.png proportions)
  const eyeSize = width * 0.042;  // dot eye diameter
  const winkW   = width * 0.058;  // wink < width
  const winkH   = width * 0.034;  // wink < height

  // Body animation values
  const floatY  = useRef(new Animated.Value(0)).current;
  const floatX  = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt    = useRef(new Animated.Value(0)).current;

  // Eye animation values
  const leftLid  = useRef(new Animated.Value(0)).current; // 0=open, 1=closed
  const rightLid = useRef(new Animated.Value(0)).current;
  const winkOp   = useRef(new Animated.Value(0)).current; // wink cover opacity

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

  /** Blink a single eyelid closed then open */
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

  /** Blink both eyes with a subtle stagger */
  const blinkBoth = async (stagger = 30) => {
    const leftBlink = blink(leftLid, 150, 45, 240);
    await wait(stagger);
    if (cancelled.current) return;
    await Promise.all([leftBlink, blink(rightLid, 160, 50, 250)]);
  };

  /** Fade the wink-cover in or out */
  const setWink = (show: boolean, ms = 380) =>
    new Promise<void>((resolve) => {
      animTo(winkOp, show ? 1 : 0, ms, soft).start(() => resolve());
    });

  useEffect(() => {
    if (!animated) return undefined;
    cancelled.current = false;

    // Start with wink eye showing (right eye winked, wink cover hidden so < is visible)
    winkOp.setValue(0);

    // ── Floating body loop ──────────────────────────────────────
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

    floatLoop.start();
    breatheLoop.start();
    loops.current = [floatLoop, breatheLoop];

    // ── Idle eye-blink behaviour ────────────────────────────────
    const run = async () => {
      await wait(1000);

      while (!cancelled.current) {
        await wait(1800 + Math.random() * 2400);
        if (cancelled.current) break;

        const roll = Math.random();

        if (roll < 0.40) {
          // Simple blink both
          await blinkBoth(35 + Math.random() * 30);
        } else if (roll < 0.58) {
          // Double blink
          await blinkBoth(30);
          await wait(130 + Math.random() * 60);
          if (cancelled.current) break;
          await blinkBoth(45);
        } else if (roll < 0.73) {
          // Left eye only
          await blink(leftLid, 160, 55, 280);
        } else if (roll < 0.87) {
          // Momentarily close wink, blink, re-open wink
          await setWink(true);   // cover the < so right eye looks "open"
          await wait(500 + Math.random() * 300);
          if (cancelled.current) break;
          await blinkBoth(40);
          await wait(180);
          await setWink(false);  // reveal wink again
        } else {
          // Slow sequential blink
          await blink(leftLid, 200, 80, 300);
          await wait(80);
          if (cancelled.current) break;
          await blink(rightLid, 180, 70, 280);
        }
      }
    };
    run();

    return () => {
      cancelled.current = true;
      clearTimers();
      loops.current.forEach((l) => l.stop());
      [floatY, floatX, breathe, tilt, leftLid, rightLid, winkOp].forEach(
        (v) => v.stopAnimation(),
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  // ── Eye overlay positions ──────────────────────────────────────
  const leftEyeStyle = {
    position: 'absolute' as const,
    left:     LEFT_EYE.cx * width  - eyeSize / 2,
    top:      LEFT_EYE.cy * h      - eyeSize / 2,
    width:    eyeSize,
    height:   eyeSize,
    overflow: 'hidden' as const,
    borderRadius: eyeSize / 2,
  };

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
      {/* Base logo */}
      <Image
        source={LOGO_PNG}
        style={{ width, height: h }}
        resizeMode="contain"
      />

      {/* Left eye (dot) — blink lid */}
      <View style={leftEyeStyle} pointerEvents="none">
        <Eyelid size={eyeSize} lidProgress={leftLid} color={LID_COLOR} />
      </View>

      {/* Right eye (wink <) — blink lid + wink cover */}
      <View style={rightEyeStyle} pointerEvents="none">
        <Eyelid size={winkH} lidProgress={rightLid} color={LID_COLOR} />
        <WinkLid width={winkW} height={winkH} opacity={winkOp} color={LID_COLOR} />
      </View>
    </Animated.View>
  );

  if (!animated) return content;

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel="MYMO"
      onPress={() => {
        // Tap → rapid playful blink
        (async () => {
          await blinkBoth(25);
          await wait(80);
          await blink(leftLid, 130, 30, 200);
        })();
      }}
    >
      {content}
    </Pressable>
  );
}

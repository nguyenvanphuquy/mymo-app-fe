import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const BOT_SIZE = 108;
const EDGE = 10;
const NAV_CLEARANCE = 100;
const HOLD_MS = 220;
const FUR = '#C9A8DC';
const FUR_DEEP = '#B08AD0';

const LEFT_EYE = { cx: 0.36, cy: 0.405, w: 0.13, h: 0.095 };
const RIGHT_EYE = { cx: 0.575, cy: 0.41, w: 0.13, h: 0.095 };
const LEFT_ARM = { x: 0.30, y: 0.54, w: 0.18, h: 0.16 };
const RIGHT_ARM = { x: 0.48, y: 0.54, w: 0.18, h: 0.16 };

const sine = Easing.inOut(Easing.sin);
const softOut = Easing.bezier(0.22, 1, 0.36, 1);
const softIn = Easing.bezier(0.4, 0, 0.2, 1);

type Mood = 'idle' | 'dance' | 'smile';

type Props = {
  visible?: boolean;
};

/** Continuous back-and-forth with sine easing — feels organic, not stepped. */
function driftLoop(
  value: Animated.Value,
  a: number,
  b: number,
  msA: number,
  msB: number,
) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: a,
        duration: msA,
        easing: sine,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: b,
        duration: msB,
        easing: sine,
        useNativeDriver: true,
      }),
    ]),
  );
}

function EyeLid({
  box,
  blink,
  size,
}: {
  box: typeof LEFT_EYE;
  blink: Animated.Value;
  size: number;
}) {
  const w = size * box.w;
  const h = size * box.h;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: size * box.cx - w / 2,
        top: size * box.cy - h / 2,
        width: w,
        height: h,
        overflow: 'hidden',
        borderRadius: w / 2,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: h * 1.05,
          backgroundColor: FUR,
          borderBottomLeftRadius: w * 0.5,
          borderBottomRightRadius: w * 0.5,
          transform: [
            {
              translateY: blink.interpolate({
                inputRange: [0, 1],
                outputRange: [-h * 1.1, 0],
              }),
            },
          ],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: w * 0.14,
          right: w * 0.14,
          top: h * 0.4,
          height: Math.max(1.5, h * 0.09),
          borderRadius: 99,
          backgroundColor: FUR_DEEP,
          opacity: blink.interpolate({
            inputRange: [0, 0.55, 1],
            outputRange: [0, 0, 0.75],
          }),
        }}
      />
    </View>
  );
}

function Arm({
  side,
  size,
  wave,
}: {
  side: 'left' | 'right';
  size: number;
  wave: Animated.Value;
}) {
  const box = side === 'left' ? LEFT_ARM : RIGHT_ARM;
  const w = size * box.w;
  const h = size * box.h;
  const rotate = wave.interpolate({
    inputRange: [-1, 0, 1],
    outputRange:
      side === 'left'
        ? ['-14deg', '-3deg', '10deg']
        : ['14deg', '3deg', '-10deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: size * box.x,
        top: size * box.y,
        width: w,
        height: h,
        transform: [
          { translateY: -h * 0.12 },
          { rotate },
          { translateY: h * 0.12 },
        ],
      }}
    >
      <Image
        source={
          side === 'left'
            ? require('../../assets/mymo-bot-arm-left.png')
            : require('../../assets/mymo-bot-arm-right.png')
        }
        style={{ width: w, height: h, opacity: 0.92 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

function Foot({
  side,
  size,
  kick,
}: {
  side: 'left' | 'right';
  size: number;
  kick: Animated.Value;
}) {
  const x = side === 'left' ? 0.39 : 0.51;
  const rotate = kick.interpolate({
    inputRange: [-1, 0, 1],
    outputRange:
      side === 'left'
        ? ['-8deg', '0deg', '6deg']
        : ['8deg', '0deg', '-6deg'],
  });
  const y = kick.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1.2, 0, -1.8],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: size * x,
        bottom: size * 0.055,
        width: size * 0.1,
        height: size * 0.065,
        borderRadius: 99,
        backgroundColor: FUR_DEEP,
        opacity: 0.35,
        transform: [{ translateY: y }, { rotate }],
      }}
    />
  );
}

export default function MymoBot({ visible = true }: Props) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: SH } = Dimensions.get('window');
  const SW = Platform.OS === 'web' ? Math.min(winW, 500) : winW;

  const minX = EDGE;
  const maxX = Math.max(EDGE, SW - BOT_SIZE - EDGE);
  const minY = insets.top + EDGE;
  const maxY = Math.max(minY, SH - BOT_SIZE - NAV_CLEARANCE - insets.bottom);

  const pos = useRef(new Animated.ValueXY({ x: minX, y: maxY })).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  // Independent drift channels (different periods = natural desync)
  const sway = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const leftArm = useRef(new Animated.Value(0)).current;
  const rightArm = useRef(new Animated.Value(0)).current;
  const leftFoot = useRef(new Animated.Value(0)).current;
  const rightFoot = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0.4)).current;
  const leftBlink = useRef(new Animated.Value(0)).current;
  const rightBlink = useRef(new Animated.Value(0)).current;

  // Mood intensity overlays (spring into / out of) — never hard-cut idle
  const energy = useRef(new Animated.Value(0)).current;
  const joy = useRef(new Animated.Value(0)).current;

  const [mood, setMood] = useState<Mood>('idle');
  const [dragging, setDragging] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canDrag = useRef(false);
  const idleLoops = useRef<Animated.CompositeAnimation[]>([]);
  const blinkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const moodTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clamp = (x: number, y: number) => ({
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  });

  const clearMoodTimers = () => {
    moodTimers.current.forEach(clearTimeout);
    moodTimers.current = [];
  };

  const blinkOnce = (which: 'both' | 'left' | 'right' = 'both') => {
    const close = 110 + Math.random() * 40;
    const hold = 30 + Math.random() * 50;
    const open = 160 + Math.random() * 60;
    const run = (v: Animated.Value, delay = 0) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: close, easing: softIn, useNativeDriver: true }),
        Animated.delay(hold),
        Animated.timing(v, { toValue: 0, duration: open, easing: softOut, useNativeDriver: true }),
      ]);

    if (which === 'left') run(leftBlink).start();
    else if (which === 'right') run(rightBlink).start();
    else {
      // Slight asymmetry — more lifelike
      Animated.parallel([
        run(leftBlink, 0),
        run(rightBlink, 18 + Math.random() * 28),
      ]).start();
    }
  };

  const springTo = (value: Animated.Value, toValue: number, friction = 9, tension = 28) => {
    Animated.spring(value, {
      toValue,
      friction,
      tension,
      useNativeDriver: true,
    }).start();
  };

  // Always-on idle drifts — never reset to zero mid-motion
  useEffect(() => {
    if (!visible || dragging) {
      idleLoops.current.forEach((l) => l.stop());
      idleLoops.current = [];
      return undefined;
    }

    const loops = [
      // Keep only the most visible channels — fewer JS/native animations
      driftLoop(sway, 0.5, -0.45, 3000, 3300),
      driftLoop(bob, -0.55, 0.4, 2600, 2900),
      driftLoop(breathe, 1.015, 0.99, 3400, 3600),
      driftLoop(leftArm, 0.4, -0.3, 2400, 2800),
      driftLoop(rightArm, -0.35, 0.45, 2800, 2500),
      driftLoop(sparkle, 0.75, 0.3, 3000, 3400),
    ];
    idleLoops.current = loops;
    loops.forEach((l) => l.start());

    // Soft static feet — no continuous kick loops
    leftFoot.setValue(0);
    rightFoot.setValue(0);
    tilt.setValue(0);

    return () => {
      loops.forEach((l) => l.stop());
      idleLoops.current = [];
    };
  }, [visible, dragging]);

  // Soft blink schedule
  useEffect(() => {
    if (!visible || dragging) return undefined;
    let alive = true;
    const schedule = () => {
      const id = setTimeout(() => {
        if (!alive) return;
        const roll = Math.random();
        if (roll < 0.72) blinkOnce('both');
        else if (roll < 0.86) blinkOnce('left');
        else blinkOnce('right');
        if (Math.random() < 0.22) {
          const id2 = setTimeout(() => {
            if (alive) blinkOnce('both');
          }, 280 + Math.random() * 120);
          blinkTimers.current.push(id2);
        }
        schedule();
      }, 2800 + Math.random() * 3200);
      blinkTimers.current.push(id);
    };
    schedule();
    return () => {
      alive = false;
      blinkTimers.current.forEach(clearTimeout);
      blinkTimers.current = [];
      leftBlink.setValue(0);
      rightBlink.setValue(0);
    };
  }, [visible, dragging]);

  // Mood bursts — spring energy/joy, then ease back to idle
  useEffect(() => {
    if (!visible || dragging) return undefined;
    clearMoodTimers();

    if (mood === 'idle') {
      springTo(energy, 0, 10, 22);
      springTo(joy, 0, 10, 22);
      return undefined;
    }

    if (mood === 'dance') {
      springTo(energy, 1, 7, 40);
      springTo(joy, 0.35, 8, 30);
      const back = setTimeout(() => {
        springTo(energy, 0, 10, 20);
        setMood('idle');
      }, 4200 + Math.random() * 1200);
      moodTimers.current.push(back);
    } else if (mood === 'smile') {
      springTo(joy, 1, 7, 36);
      springTo(energy, 0.25, 9, 28);
      const back = setTimeout(() => {
        springTo(joy, 0, 10, 22);
        springTo(energy, 0, 10, 22);
        setMood('idle');
      }, 3200 + Math.random() * 1000);
      moodTimers.current.push(back);
    }

    return () => clearMoodTimers();
  }, [mood, visible, dragging]);

  // Occasional playful mood — mostly stays idle
  useEffect(() => {
    if (!visible || dragging) return undefined;
    const id = setInterval(() => {
      setMood((prev) => {
        if (prev !== 'idle') return prev;
        return Math.random() > 0.55 ? 'dance' : 'smile';
      });
    }, 9000 + Math.random() * 5000);
    return () => clearInterval(id);
  }, [visible, dragging]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          canDrag.current || Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          pos.stopAnimation((value) => {
            pos.setOffset({ x: value.x, y: value.y });
            pos.setValue({ x: 0, y: 0 });
          });

          holdTimer.current = setTimeout(() => {
            canDrag.current = true;
            setDragging(true);
            setMood('dance');
            Animated.spring(dragScale, {
              toValue: 1.06,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }).start();
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
          }, HOLD_MS);
        },
        onPanResponderMove: (_, g) => {
          if (!canDrag.current) {
            if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) {
              if (holdTimer.current) {
                clearTimeout(holdTimer.current);
                holdTimer.current = null;
              }
              canDrag.current = true;
              setDragging(true);
              Animated.spring(dragScale, {
                toValue: 1.06,
                friction: 7,
                useNativeDriver: true,
              }).start();
            } else {
              return;
            }
          }
          pos.setValue({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: (_, g) => {
          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }

          const wasDragging = canDrag.current;
          canDrag.current = false;
          setDragging(false);
          pos.flattenOffset();

          if (!wasDragging && Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
            setMood((prev) => (prev === 'idle' ? (Math.random() > 0.5 ? 'dance' : 'smile') : 'idle'));
            blinkOnce('both');
            if (Platform.OS !== 'web') {
              Haptics.selectionAsync().catch(() => {});
            }
          }

          pos.stopAnimation((value) => {
            const next = clamp(value.x, value.y);
            Animated.parallel([
              Animated.spring(pos, {
                toValue: next,
                friction: 8,
                tension: 48,
                useNativeDriver: true,
              }),
              Animated.spring(dragScale, {
                toValue: 1,
                friction: 7,
                useNativeDriver: true,
              }),
            ]).start();
          });
        },
        onPanResponderTerminate: () => {
          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }
          canDrag.current = false;
          setDragging(false);
          pos.flattenOffset();
          pos.stopAnimation((value) => {
            const next = clamp(value.x, value.y);
            Animated.spring(pos, {
              toValue: next,
              friction: 8,
              useNativeDriver: true,
            }).start();
          });
          Animated.spring(dragScale, { toValue: 1, friction: 7, useNativeDriver: true }).start();
        },
      }),
    [minX, maxX, minY, maxY],
  );

  if (!visible) return null;

  const joyScale = joy.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });
  const energyBobExtra = energy.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const joyBobExtra = joy.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });
  const idleBobY = bob.interpolate({
    inputRange: [-1, 1],
    outputRange: [-3.2, 2.2],
  });
  const totalBobY = Animated.add(idleBobY, Animated.add(energyBobExtra, joyBobExtra));

  const idleRotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });
  const tiltRotate = tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-2.2deg', '2.2deg'],
  });
  const energyWiggle = Animated.multiply(energy, sway).interpolate({
    inputRange: [-1, 1],
    outputRange: ['-7deg', '7deg'],
  });

  const armBoostL = energy.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
  const armBoostR = energy.interpolate({ inputRange: [0, 1], outputRange: [0, -0.5] });
  const joyArmL = joy.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  const joyArmR = joy.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  const leftArmWave = Animated.add(leftArm, Animated.add(armBoostL, joyArmL));
  const rightArmWave = Animated.add(rightArm, Animated.add(armBoostR, joyArmR));

  const footBoostL = energy.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const footBoostR = energy.interpolate({ inputRange: [0, 1], outputRange: [0, -0.4] });
  const leftFootKick = Animated.add(leftFoot, footBoostL);
  const rightFootKick = Animated.add(rightFoot, footBoostR);

  const sparkleScale = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.08],
  });
  const sparkleOpacity = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.75],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.wrap,
        {
          width: BOT_SIZE,
          height: BOT_SIZE,
          transform: [{ translateX: pos.x }, { translateY: pos.y }],
          zIndex: dragging ? 80 : 40,
        },
      ]}
      accessibilityLabel="MYMO bot"
      accessibilityRole="image"
    >
      <Animated.View
        style={[
          styles.inner,
          {
            transform: [
              { scale: Animated.multiply(Animated.multiply(dragScale, breathe), joyScale) },
              { translateY: totalBobY },
              { rotate: idleRotate },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            transform: [{ rotate: tiltRotate }],
          }}
        >
          <Animated.View
            style={{
              width: '100%',
              height: '100%',
              transform: [{ rotate: energyWiggle }],
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sparkle,
                styles.sparkleTL,
                { opacity: sparkleOpacity, transform: [{ rotate: '45deg' }, { scale: sparkleScale }] },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sparkle,
                styles.sparkleBR,
                { opacity: sparkleOpacity, transform: [{ rotate: '45deg' }, { scale: sparkleScale }] },
              ]}
            />

            <Image
              source={require('../../assets/mymo-bot.png')}
              style={styles.image}
              resizeMode="contain"
            />

            <Foot side="left" size={BOT_SIZE} kick={leftFootKick} />
            <Foot side="right" size={BOT_SIZE} kick={rightFootKick} />
            <Arm side="left" size={BOT_SIZE} wave={leftArmWave} />
            <Arm side="right" size={BOT_SIZE} wave={rightArmWave} />
            <EyeLid box={LEFT_EYE} blink={leftBlink} size={BOT_SIZE} />
            <EyeLid box={RIGHT_EYE} blink={rightBlink} size={BOT_SIZE} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    elevation: 20,
  },
  inner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  sparkle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#FF9EC8',
    zIndex: 2,
  },
  sparkleTL: {
    top: 8,
    left: 10,
  },
  sparkleBR: {
    bottom: 14,
    right: 8,
    width: 6,
    height: 6,
    backgroundColor: '#C9A8FF',
  },
});

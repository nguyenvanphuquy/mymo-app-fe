import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import { getCurrentWeather, type WeatherCurrent, type WeatherKind } from '../services/weatherApi';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

interface MapWeatherProps {
  lat: number;
  lng: number;
  cardBg: string;
  chipBg: string;
  chipBorder: string;
  iconColor: string;
}

export default function MapWeather({ lat, lng, cardBg, chipBg, chipBorder, iconColor }: MapWeatherProps) {
  const { t } = useI18n();
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const latKey = lat.toFixed(2);
  const lngKey = lng.toFixed(2);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getCurrentWeather(Number(latKey), Number(lngKey))
        .then(next => {
          if (!cancelled && next) setWeather(next);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [latKey, lngKey]);

  const kind = weather?.kind ?? null;
  const isDay = weather?.isDay ?? true;
  const temp = weather ? `${Math.round(weather.tempC)}°` : '—';

  return (
    <>
      {kind ? <WeatherEffects kind={kind} isDay={isDay} /> : null}
      <View style={styles.weatherWrap} pointerEvents="none">
        <View style={[styles.weatherCard, { backgroundColor: cardBg }]}>
          <Ionicons name={iconFor(kind, isDay)} size={16} color={iconColor} />
          <Text style={styles.weatherTemp}>{temp}</Text>
        </View>
        <View style={[styles.weatherSub, { backgroundColor: chipBg, borderColor: chipBorder }]}>
          <Text style={styles.weatherSubText}>{t(labelFor(kind, isDay))}</Text>
        </View>
      </View>
    </>
  );
}

function iconFor(kind: WeatherKind | null, isDay: boolean): React.ComponentProps<typeof Ionicons>['name'] {
  if (kind === 'sunny') return isDay ? 'sunny-outline' : 'moon-outline';
  if (kind === 'rain') return 'rainy-outline';
  if (kind === 'thunder') return 'thunderstorm-outline';
  if (kind === 'snow') return 'snow-outline';
  if (kind === 'fog') return 'cloud-outline';
  if (kind === 'cloudy') return 'cloudy-outline';
  return 'partly-sunny-outline';
}

function labelFor(kind: WeatherKind | null, isDay: boolean): string {
  if (kind === 'sunny') return isDay ? 'map.weatherSunny' : 'map.weatherClear';
  if (kind === 'rain') return 'map.weatherRain';
  if (kind === 'thunder') return 'map.weatherThunder';
  if (kind === 'snow') return 'map.weatherSnow';
  if (kind === 'fog') return 'map.weatherFog';
  if (kind === 'cloudy') return 'map.weatherCloudy';
  return 'map.weatherNice';
}

function WeatherEffects({ kind, isDay }: { kind: WeatherKind; isDay: boolean }) {
  return (
    <View style={styles.effects} pointerEvents="none">
      {kind === 'sunny' && isDay ? <SunGlow /> : null}
      {kind === 'sunny' && !isDay ? <Stars /> : null}
      {(kind === 'cloudy' || kind === 'rain' || kind === 'thunder') ? <Clouds /> : null}
      {(kind === 'rain' || kind === 'thunder') ? <Falling count={kind === 'thunder' ? 28 : 20} variant="rain" /> : null}
      {kind === 'snow' ? <Falling count={18} variant="snow" /> : null}
      {kind === 'thunder' ? <Lightning /> : null}
      {kind === 'fog' ? (
        <LinearGradient
          colors={['rgba(255,255,255,0.42)', 'rgba(226,232,240,0.18)', 'rgba(255,255,255,0.05)']}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

function SunGlow() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 4600, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] });
  return <Animated.View style={[styles.sun, { opacity }]} />;
}

function Stars() {
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: (i * 67) % SCREEN_W,
              top: (i * 41) % (SCREEN_H * 0.45),
              opacity: 0.35 + (i % 4) * 0.12,
            },
          ]}
        />
      ))}
    </>
  );
}

function Clouds() {
  return (
    <>
      <Cloud top={36} delay={0} width={150} />
      <Cloud top={92} delay={400} width={110} />
      <Cloud top={150} delay={900} width={130} />
    </>
  );
}

function Cloud({ top, delay, width }: { top: number; delay: number; width: number }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(drift, { toValue: 1, duration: 26000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(drift, { toValue: 0, duration: 26000, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, drift]);
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-24, 36] });
  return (
    <Animated.View style={[styles.cloud, { top, width, transform: [{ translateX }] }]} />
  );
}

function Falling({ count, variant }: { count: number; variant: 'rain' | 'snow' }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Particle key={i} index={i} variant={variant} />
      ))}
    </>
  );
}

function Particle({ index, variant }: { index: number; variant: 'rain' | 'snow' }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const duration = variant === 'rain' ? 2000 + (index % 6) * 280 : 4800 + (index % 5) * 700;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay((index * 140) % 1400),
        Animated.timing(fall, { toValue: 1, duration, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      { resetBeforeIteration: true },
    );
    anim.start();
    return () => anim.stop();
  }, [fall, index, variant]);
  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-30, SCREEN_H + 24] });
  const left = (index * 53) % Math.max(SCREEN_W - 8, 1);
  return (
    <Animated.View
      style={[
        variant === 'rain' ? styles.drop : styles.flake,
        { left, transform: [{ translateY }, { rotate: variant === 'rain' ? '18deg' : '0deg' }] },
      ]}
    />
  );
}

function Lightning() {
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(4800),
        Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(flash, { toValue: 0, duration: 160, useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(280),
        Animated.timing(flash, { toValue: 0.7, duration: 70, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(flash, { toValue: 0, duration: 240, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [flash]);
  return <Animated.View style={[styles.flash, { opacity: flash }]} />;
}

const styles = StyleSheet.create({
  effects: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },
  sun: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 214, 90, 0.55)',
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFF8D6',
  },
  cloud: {
    position: 'absolute',
    left: 24,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  drop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 22,
    borderRadius: 2,
    backgroundColor: 'rgba(190, 220, 255, 0.8)',
  },
  flake: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  weatherWrap: {
    position: 'absolute',
    left: 16,
    bottom: 158,
    gap: 8,
    zIndex: 2,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...Shadows.soft,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  weatherSub: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  weatherSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMid,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { B2bPackageId } from '../../constants/b2bPromotionPackages';

export default function B2bMapPreview({
  venueName,
  packageId,
}: {
  venueName: string;
  packageId: B2bPackageId;
}) {
  const { t } = useI18n();
  const featured = packageId === 'featured_venue';
  const event = packageId === 'event_boost';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('biz.ads.mapPreviewTitle')}</Text>
      <View style={styles.map}>
        <LinearGradient colors={['#F4F1FA', '#E8E4F0']} style={StyleSheet.absoluteFill} />
        {[1, 2, 3, 4, 5].map(i => (
          <View
            key={i}
            style={[
              styles.road,
              { top: `${15 + i * 14}%`, transform: [{ rotate: i % 2 ? '8deg' : '-6deg' }] },
            ]}
          />
        ))}
        <View style={[styles.pin, styles.pinMuted, { top: '28%', left: '22%' }]}>
          <Ionicons name="cafe-outline" size={14} color={Colors.textMuted} />
        </View>
        <View style={[styles.pin, styles.pinMuted, { top: '55%', left: '68%' }]}>
          <Ionicons name="restaurant-outline" size={14} color={Colors.textMuted} />
        </View>
        <View
          style={[
            styles.pinHero,
            featured && styles.pinFeatured,
            event && styles.pinEvent,
            { top: '42%', left: '44%' },
          ]}
        >
          {featured ? (
            <LinearGradient colors={Gradients.primary} style={styles.pinGrad}>
              <Ionicons name="star" size={16} color={Colors.white} />
            </LinearGradient>
          ) : (
            <View style={[styles.pinGrad, { backgroundColor: Colors.primary }]}>
              <Ionicons name={event ? 'calendar' : 'location'} size={16} color={Colors.white} />
            </View>
          )}
          {featured || event ? <View style={styles.pulse} /> : null}
        </View>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle} numberOfLines={1}>{venueName || t('biz.ads.yourVenue')}</Text>
          <Text style={styles.calloutSub}>
            {featured
              ? t('biz.ads.previewFeatured')
              : event
                ? t('biz.ads.previewEvent')
                : t('biz.ads.previewStarter')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  map: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E4F0',
    ...Shadows.soft,
  },
  road: {
    position: 'absolute',
    left: '-10%',
    width: '120%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 2,
  },
  pin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  pinMuted: { opacity: 0.75 },
  pinHero: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pinFeatured: { zIndex: 3 },
  pinEvent: { zIndex: 3 },
  pinGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  pulse: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124,91,255,0.18)',
    zIndex: -1,
  },
  callout: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  calloutTitle: { fontSize: 14, fontWeight: '900', color: Colors.textDark },
  calloutSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },
});

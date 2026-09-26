import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import SparkleField from '../components/SparkleField';
import MymoLogo from '../components/MymoLogo';

interface PortalChoiceScreenProps {
  onChooseUser: () => void;
  onChooseBusiness: () => void;
}

export default function PortalChoiceScreen({
  onChooseUser,
  onChooseBusiness,
}: PortalChoiceScreenProps) {
  const { t } = useI18n();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F0EAFF', '#DDD0FF', '#C9B8FF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SparkleField count={Platform.OS === 'web' ? 6 : 10} />

      <View style={styles.inner}>
        <MymoLogo width={100} />
        <Text style={styles.title}>{t('portalChoice.title')}</Text>
        <Text style={styles.sub}>{t('portalChoice.subtitle')}</Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.88}
          onPress={onChooseUser}
        >
          <LinearGradient colors={Gradients.primary} style={styles.cardIcon}>
            <Ionicons name="map" size={28} color={Colors.white} />
          </LinearGradient>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('portalChoice.userTitle')}</Text>
            <Text style={styles.cardDesc}>{t('portalChoice.userDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.88}
          onPress={onChooseBusiness}
        >
          <LinearGradient colors={['#5B4AE0', '#8B5CF6']} style={styles.cardIcon}>
            <Ionicons name="storefront" size={28} color={Colors.white} />
          </LinearGradient>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('portalChoice.businessTitle')}</Text>
            <Text style={styles.cardDesc}>{t('portalChoice.businessDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...Platform.select({
      web: { maxWidth: 500, width: '100%', marginHorizontal: 'auto' },
      default: {},
    }),
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 48 : 72,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    marginHorizontal: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  cardDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
  },
});

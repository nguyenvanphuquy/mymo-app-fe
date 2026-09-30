import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import SparkleField from '../../components/SparkleField';
import { B2B_VIBEMAP_PACKAGES } from '../../constants/b2bPromotionPackages';
import { getActiveVibeMapPackage } from '../../services/businessAdCampaignApi';
import {
  getMyBusinesses,
  getMyPlaces,
  type BusinessDto,
  type BusinessPlaceDto,
  type BusinessSession,
} from '../../services/businessApi';

export default function BusinessBrandScreen({
  session,
  packageRefreshKey = 0,
  onLogout,
  onSwitchToUserApp,
  onOpenAdvertising,
  onNavigateToPlaces,
  onNavigateToEvents,
  onOpenNotifications,
  onOpenBilling,
  onOpenEditProfile,
  onOpenHelp,
}: {
  session: BusinessSession;
  packageRefreshKey?: number;
  onLogout: () => void;
  onSwitchToUserApp?: () => void;
  onOpenAdvertising: () => void;
  onNavigateToPlaces?: () => void;
  onNavigateToEvents?: () => void;
  onOpenNotifications?: () => void;
  onOpenBilling?: () => void;
  onOpenEditProfile?: () => void;
  onOpenHelp?: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [business, setBusiness] = useState<BusinessDto | null>(null);
  const [places, setPlaces] = useState<BusinessPlaceDto[]>([]);
  const [activePkgId, setActivePkgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [bizList, pl] = await Promise.all([getMyBusinesses(), getMyPlaces()]);
      setBusiness(bizList[0] ?? null);
      setPlaces(pl);
      const active = await getActiveVibeMapPackage();
      setActivePkgId(active.packageId);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, packageRefreshKey]);

  const activePkg = activePkgId ? B2B_VIBEMAP_PACKAGES.find(p => p.id === activePkgId) : null;
  const approvedPlaces = places.filter(p => p.status === 'Approved');
  const totalCheckIns = places.reduce((s, p) => s + p.checkInCount, 0);
  const totalReviews = places.reduce((s, p) => s + p.reviewCount, 0);
  const avgRating = places.length
    ? places.reduce((s, p) => s + p.averageRating, 0) / places.length
    : 0;

  const statusLabel = business?.status === 'Approved'
    ? t('biz.profile.statusApproved')
    : t('biz.profile.statusPartner');

  return (
    <View style={styles.root}>
      <SparkleField count={Platform.OS === 'web' ? 6 : 10} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#9C7CFF', '#7C5BFF', '#6B4FE0']}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={12} color={Colors.white} />
              <Text style={styles.heroBadgeText}>{t('biz.badge')}</Text>
            </View>
            <Text style={styles.heroEmail} numberOfLines={1}>{session.email}</Text>
          </View>

          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {business?.logoUrl ? (
                <Image source={{ uri: business.logoUrl }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={['#FFFFFF', '#F0EAFF']} style={styles.avatarFallback}>
                  <Ionicons name="storefront" size={36} color={Colors.primary} />
                </LinearGradient>
              )}
            </View>
            {business?.verified ? (
              <View style={styles.verifiedDot}>
                <Ionicons name="checkmark" size={12} color={Colors.white} />
              </View>
            ) : null}
          </View>

          <Text style={styles.displayName}>{business?.name ?? session.displayName}</Text>
          <Text style={styles.legalName}>{session.email}</Text>

          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{statusLabel}</Text>
            </View>
            {activePkg ? (
              <View style={[styles.tag, styles.tagLight]}>
                <Ionicons name="megaphone-outline" size={11} color={Colors.white} />
                <Text style={styles.tagText}>{t(activePkg.nameKey)}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={styles.statsRow}>
                <StatChip icon="location" value={String(places.length)} label={t('biz.nav.places')} />
                <StatChip icon="footsteps" value={String(totalCheckIns)} label={t('biz.home.checkins')} />
                <StatChip
                  icon="star"
                  value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
                  label={t('biz.profile.rating')}
                />
                <StatChip icon="chatbubbles" value={String(totalReviews)} label={t('biz.profile.reviews')} />
              </View>

              {business?.description ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>{t('biz.profile.about')}</Text>
                  <Text style={styles.bio}>{business.description}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>{t('biz.profile.quickActions')}</Text>
              <View style={styles.actions}>
                <ActionTile
                  icon="megaphone"
                  colors={Gradients.primary}
                  title={t('biz.profile.actionAds')}
                  sub={t('biz.profile.actionAdsSub')}
                  onPress={onOpenAdvertising}
                />
                <ActionTile
                  icon="location"
                  colors={['#7CC4FF', '#5B9FD4'] as const}
                  title={t('biz.profile.actionPlaces')}
                  sub={`${approvedPlaces.length} ${t('biz.profile.approved')}`}
                  onPress={onNavigateToPlaces}
                />
                <ActionTile
                  icon="calendar"
                  colors={['#FFB8E0', '#E879A8'] as const}
                  title={t('biz.profile.actionEvents')}
                  sub={t('biz.profile.actionEventsSub')}
                  onPress={onNavigateToEvents}
                />
              </View>

              {places.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>{t('biz.profile.venues')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueScroll}>
                    {places.map(p => (
                      <View key={p.placeId} style={styles.venueCard}>
                        {p.thumbnailUrl ? (
                          <Image source={{ uri: p.thumbnailUrl }} style={styles.venueImg} />
                        ) : (
                          <View style={styles.venueImgPlaceholder}>
                            <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
                          </View>
                        )}
                        <Text style={styles.venueName} numberOfLines={1}>{p.name}</Text>
                        <View style={styles.venueMeta}>
                          <StatusPill status={p.status} t={t} />
                          <Text style={styles.venueCheckins}>{p.checkInCount} ↗</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={styles.sectionTitle}>{t('biz.profile.contact')}</Text>
              <View style={styles.contactCard}>
                <ContactRow icon="call-outline" label={t('biz.register.phone')} value={business?.phone} />
                <ContactRow icon="mail-outline" label="Email" value={business?.email ?? session.email} />
                <ContactRow icon="globe-outline" label="Web" value={business?.website} />
              </View>

              <View style={styles.perks}>
                <Text style={styles.perksTitle}>{t('biz.profile.perksTitle')}</Text>
                {(['biz.profile.perk1', 'biz.profile.perk2', 'biz.profile.perk3'] as const).map(key => (
                  <View key={key} style={styles.perkRow}>
                    <View style={styles.perkIcon}>
                      <Ionicons name="heart" size={14} color={Colors.primary} />
                    </View>
                    <Text style={styles.perkText}>{t(key)}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>{t('biz.profile.settingsTitle')}</Text>
              <View style={styles.settingsCard}>
                <SettingsRow icon="create-outline" label={t('biz.profile.menuEdit')} onPress={onOpenEditProfile} />
                <SettingsRow icon="notifications-outline" label={t('biz.profile.menuNotif')} onPress={onOpenNotifications} />
                <SettingsRow icon="card-outline" label={t('biz.profile.menuBilling')} onPress={onOpenBilling} />
                <SettingsRow icon="help-circle-outline" label={t('biz.profile.menuHelp')} onPress={onOpenHelp} last />
              </View>
            </>
          )}

          <Text style={styles.hint}>{t('biz.brand.hint')}</Text>
          {onSwitchToUserApp ? (
            <TouchableOpacity onPress={onSwitchToUserApp} style={styles.userAppLink} activeOpacity={0.85}>
              <Ionicons name="map-outline" size={18} color={Colors.primary} />
              <Text style={styles.userAppLinkText}>{t('portalChoice.openUserApp')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onLogout} style={styles.logout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color={Colors.primary} />
            <Text style={styles.logoutText}>{t('biz.brand.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon, label, onPress, last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.settingsRow, last && styles.settingsRowLast]}
      activeOpacity={0.88}
    >
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function StatChip({
  icon, value, label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function ActionTile({
  icon, colors, title, sub, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: readonly [string, string, ...string[]];
  title: string;
  sub: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionTile}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.88 : 1}
    >
      <LinearGradient colors={colors} style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={Colors.white} />
      </LinearGradient>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub} numberOfLines={2}>{sub}</Text>
    </TouchableOpacity>
  );
}

function ContactRow({
  icon, label, value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIconWrap}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value?.trim() || '—'}</Text>
      </View>
    </View>
  );
}

function StatusPill({ status, t }: { status: string; t: (k: string) => string }) {
  const approved = status === 'Approved';
  return (
    <View style={[styles.statusPill, approved ? styles.statusOk : styles.statusPending]}>
      <Text style={[styles.statusText, approved ? styles.statusTextOk : styles.statusTextPending]}>
        {approved ? t('biz.profile.approved') : status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFC' },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  heroEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', maxWidth: '55%' },
  avatarRing: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    ...Shadows.glow,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verifiedDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.activeGreen,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: { fontSize: 24, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  legalName: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagLight: { backgroundColor: 'rgba(255,255,255,0.28)' },
  tagText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  body: { paddingHorizontal: 20, marginTop: -12 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statChip: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  statVal: { fontSize: 20, fontWeight: '900', color: Colors.textDark, marginTop: 6 },
  statLbl: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginTop: 2 },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 10,
  },
  bio: { fontSize: 14, color: Colors.textMid, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: {
    width: '31%',
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: { fontSize: 12, fontWeight: '900', color: Colors.textDark },
  actionSub: { fontSize: 10, color: Colors.textMuted, marginTop: 4, lineHeight: 14 },
  venueScroll: { gap: 12, paddingRight: 8 },
  venueCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  venueImg: { width: '100%', height: 88 },
  venueImgPlaceholder: {
    height: 88,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueName: { fontSize: 13, fontWeight: '800', color: Colors.textDark, paddingHorizontal: 10, paddingTop: 8 },
  venueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  venueCheckins: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusOk: { backgroundColor: 'rgba(16,185,129,0.15)' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 9, fontWeight: '800' },
  statusTextOk: { color: Colors.activeGreen },
  statusTextPending: { color: '#92400E' },
  contactCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    ...Shadows.soft,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F0F8',
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  contactValue: { fontSize: 14, fontWeight: '600', color: Colors.textDark, marginTop: 2 },
  perks: {
    marginTop: 16,
    backgroundColor: Colors.primaryTint,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  perksTitle: { fontSize: 14, fontWeight: '900', color: Colors.textDark, marginBottom: 10 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  perkIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: { flex: 1, fontSize: 13, color: Colors.textMid, fontWeight: '600' },
  settingsCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEAF5',
    overflow: 'hidden',
    ...Shadows.soft,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F0F8',
  },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textDark },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 24, lineHeight: 18 },
  userAppLink: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.primaryTint,
  },
  userAppLinkText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  logout: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  logoutText: { fontWeight: '800', color: Colors.primary },
});

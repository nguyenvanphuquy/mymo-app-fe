import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useI18n, type Lang } from '../i18n';
import type { ActivityStats } from '../services/userApi';

interface ActivityStatsSheetProps {
  visible: boolean;
  loading: boolean;
  stats: ActivityStats | null;
  onClose: () => void;
}

const ACHIEVEMENT_KEYS = ['firstPost', 'tenPosts', 'fivePlaces', 'tenLikes', 'fiveFriends', 'streak3'] as const;

function monthLabel(year: number, month: number, lang: Lang) {
  if (lang === 'vi') return `T${month}`;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

export default function ActivityStatsSheet({ visible, loading, stats, onClose }: ActivityStatsSheetProps) {
  const { t, lang } = useI18n();
  const cards = stats
    ? [
        { n: stats.placesExplored, l: t('stats.places') },
        { n: stats.postsCreated, l: t('stats.posts') },
        { n: stats.likesReceived, l: t('stats.likes') },
        { n: stats.newFriends, l: t('stats.newFriends') },
      ]
    : [];
  const peak = Math.max(1, ...(stats?.months.map(month => month.posts + month.checkIns) ?? [1]));
  const interestPeak = Math.max(1, ...(stats?.interests.map(item => item.count) ?? [1]));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>MYMO</Text>
              <Text style={styles.title}>{t('stats.title')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={18} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          {loading && !stats ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : !stats ? (
            <Text style={styles.empty}>{t('stats.loadError')}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
              <View style={styles.grid}>
                {cards.map(card => (
                  <View key={card.l} style={styles.card}>
                    <Text style={styles.cardN}>{card.n}</Text>
                    <Text style={styles.cardL}>{card.l}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.hint}>
                {stats.photoPosts} {t('stats.photos')} · {stats.checkIns} {t('stats.checkins')} · {stats.commentsReceived} {t('stats.comments')}
              </Text>
              <Text style={styles.hint}>{t('stats.newFriendsHint')}</Text>

              <Text style={styles.section}>{t('stats.monthly')}</Text>
              <View style={styles.chart}>
                {stats.months.map(month => {
                  const total = month.posts + month.checkIns;
                  const height = Math.max(6, Math.round((total / peak) * 92));
                  return (
                    <View key={`${month.year}-${month.month}`} style={styles.barCol}>
                      <Text style={styles.barValue}>{total}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { height }]} />
                      </View>
                      <Text style={styles.barLabel}>{monthLabel(month.year, month.month, lang)}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.section}>{t('stats.interests')}</Text>
              {stats.interests.length === 0 ? (
                <Text style={styles.empty}>{t('stats.emptyInterests')}</Text>
              ) : (
                stats.interests.map(item => (
                  <View key={item.name} style={styles.interest}>
                    <View style={styles.interestTop}>
                      <Text style={styles.interestName}>{item.name}</Text>
                      <Text style={styles.interestCount}>{item.count}</Text>
                    </View>
                    <View style={styles.interestTrack}>
                      <View style={[styles.interestFill, { width: `${Math.round((item.count / interestPeak) * 100)}%` }]} />
                    </View>
                  </View>
                ))
              )}

              <Text style={styles.section}>{t('stats.achievements')}</Text>
              <Text style={styles.hint}>{t('stats.streak')}: {stats.streakDays}</Text>
              <View style={styles.badges}>
                {ACHIEVEMENT_KEYS.map(key => {
                  const unlocked = stats.achievements.some(item => item.key === key && item.unlocked);
                  return (
                    <View key={key} style={[styles.badge, unlocked && styles.badgeOn]}>
                      <Ionicons
                        name={unlocked ? 'ribbon' : 'lock-closed'}
                        size={13}
                        color={unlocked ? Colors.primary : Colors.textMuted}
                      />
                      <Text style={[styles.badgeText, unlocked && styles.badgeTextOn]}>{t(`stats.ach.${key}`)}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(79,40,82,0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginVertical: 40,
  },
  body: {
    paddingBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#FBF7FD',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  cardN: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
  },
  cardL: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMid,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textMuted,
  },
  section: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    backgroundColor: '#FBF7FD',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  barTrack: {
    height: 92,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMid,
  },
  empty: {
    fontSize: 13,
    color: Colors.textMuted,
    marginVertical: 8,
  },
  interest: {
    marginBottom: 10,
  },
  interestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  interestName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  interestCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  interestTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#F3E8F6',
    overflow: 'hidden',
  },
  interestFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#E7A6EA',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F6F3F8',
  },
  badgeOn: {
    backgroundColor: '#F8E9FF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  badgeTextOn: {
    color: Colors.primary,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  Platform, ActivityIndicator, DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Lang } from '../i18n';
import { getUserPublicProfile, type PublicUserProfile } from '../services/userApi';
import { getUserPosts, toPostView, type FeedPost, type PostView } from '../services/postApi';
import { formatDateOnlyDisplay } from '../utils/dateOnly';
import ProfileMomentsGrid from '../components/ProfileMomentsGrid';
import PostSheet from '../components/PostSheet';
import { avatarUri } from '../constants/defaultAvatar';
import {
  acceptFriend,
  getFriendStatus,
  requestFriend,
  type FriendStatusResponse,
} from '../services/friendsApi';

import { openUserProfile } from '../utils/openUserProfile';
import PremiumBadge from '../components/PremiumBadge';
import { frameColor, themeBackground } from '../constants/profileStyle';

export interface FriendProfileParams {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
}

interface FriendProfileScreenProps extends FriendProfileParams {
  onClose: () => void;
  onMessage: () => void;
}

export default function FriendProfileScreen({
  userId,
  displayName: initialName,
  avatarUrl: initialAvatar,
  onClose,
  onMessage,
}: FriendProfileScreenProps) {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatusResponse | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, postsData, statusData] = await Promise.all([
        getUserPublicProfile(userId),
        getUserPosts(userId),
        getFriendStatus(userId),
      ]);
      setProfile(profileData);
      setPosts(postsData);
      setFriendStatus(statusData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('friendProfile.loadError');
      setError(message);
      Toast.show({ type: 'error', text1: message });
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const genderLabel = profile?.gender === 'Male'
    ? t('auth.genderOptionMale')
    : profile?.gender === 'Female'
      ? t('auth.genderOptionFemale')
      : profile?.gender === 'Other'
        ? t('auth.genderOptionOther')
        : profile?.gender;
  const name = profile?.displayName || initialName || t('friends.someone');
  const avatar = avatarUri(profile?.avatarUrl || initialAvatar);
  const status = friendStatus?.status.toLowerCase() ?? 'none';
  const isFriend = status === 'accepted';
  const isIncomingRequest = status === 'pending' && friendStatus?.isIncoming;
  const isOutgoingRequest = status === 'pending' && !friendStatus?.isIncoming;

  const handleFriendAction = async () => {
    if (friendActionLoading || isFriend || isOutgoingRequest) return;
    setFriendActionLoading(true);
    try {
      if (isIncomingRequest) {
        await acceptFriend(userId);
        setFriendStatus({ userId, status: 'Accepted', isIncoming: false });
        DeviceEventEmitter.emit('friend:accepted', { userId });
        Toast.show({ type: 'success', text1: t('friendProfile.accepted') });
      } else {
        await requestFriend(userId);
        setFriendStatus({ userId, status: 'Pending', isIncoming: false });
        DeviceEventEmitter.emit('friend:requested', { userId });
        Toast.show({ type: 'success', text1: t('friendProfile.requestSent') });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('friendProfile.friendActionError'),
      });
    } finally {
      setFriendActionLoading(false);
    }
  };

  const stats = [
    { n: String(posts.length || profile?.postCount || 0), l: t('profile.moments'), icon: 'trail-sign-outline' as const },
    { n: profile ? String(profile.friendCount) : '—', l: t('profile.friends'), icon: 'people-outline' as const },
    { n: profile ? String(profile.placeCount) : '—', l: t('profile.places'), icon: 'location-outline' as const },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {profile?.coverUrl ? (
            <Image source={{ uri: profile.coverUrl }} style={styles.heroBg} />
          ) : (
            <LinearGradient colors={['#F4C4F1', '#DA70D6', '#7C3AED']} style={styles.heroBg} />
          )}
          <LinearGradient
            colors={['rgba(42,23,88,0.15)', 'rgba(42,23,88,0.55)']}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backBtn, { top: Math.max(12, insets.top) }]}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, profile?.isPremium && themeBackground(profile.profileTheme) ? { backgroundColor: themeBackground(profile.profileTheme)! } : null]}>
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.loadingText}>{t('profile.loading')}</Text>
            </View>
          )}
          {error && !loading && (
            <TouchableOpacity onPress={loadProfile} style={styles.errorRow}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retryText}>{t('place.retry')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.avatarRow}>
            <Image
              source={{ uri: avatar }}
              style={[
                styles.avatar,
                profile?.isPremium && frameColor(profile.avatarFrame)
                  ? { borderWidth: 3, borderColor: frameColor(profile.avatarFrame)! }
                  : null,
              ]}
            />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{name}</Text>
                {profile?.isPremium ? <PremiumBadge /> : null}
              </View>
              {profile?.isPremium && profile.profileTitle ? (
                <Text style={styles.titlePill}>{t(`style.title.${profile.profileTitle}`)}</Text>
              ) : null}
              {profile?.username ? (
                <Text style={styles.username}>@{profile.username}</Text>
              ) : null}
              {profile && (
                <View style={styles.metaRow}>
                  {genderLabel ? <Text style={styles.metaText}>{genderLabel}</Text> : null}
                  {profile.gender && profile.dateOfBirth ? <Text style={styles.metaDot}>•</Text> : null}
                  {profile.dateOfBirth ? (
                    <Text style={styles.metaText}>
                      {formatDateOnlyDisplay(profile.dateOfBirth, lang as Lang)}
                    </Text>
                  ) : null}
                </View>
              )}
              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              {profile?.createdAt ? (
                <Text style={styles.joined}>
                  {t('profile.joinedPrefix')}{' '}
                  {new Date(profile.createdAt).toLocaleDateString(lang === 'vi' ? 'vi' : 'en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              ) : null}
            </View>
          </View>

          {profile?.isPremium && (profile.favoritePlaces?.length ?? 0) > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoriteRow}>
              {profile.favoritePlaces?.map(place => (
                <View key={place.placeId} style={styles.favoriteChip}>
                  <Ionicons name="location" size={12} color={Colors.primary} />
                  <Text style={styles.favoriteText}>{place.name}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.statsRow}>
            {stats.map(stat => (
              <View key={stat.l} style={styles.statBox}>
                <Ionicons name={stat.icon} size={14} color={Colors.primary} />
                <Text style={styles.statNum}>{stat.n}</Text>
                <Text style={styles.statLabel}>{stat.l}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            {status !== 'self' ? (
              <TouchableOpacity
                onPress={handleFriendAction}
                style={[
                  styles.friendBtn,
                  (isFriend || isOutgoingRequest) && styles.friendBtnPassive,
                ]}
                activeOpacity={isFriend || isOutgoingRequest ? 1 : 0.85}
                disabled={friendActionLoading || isFriend || isOutgoingRequest}
            >
                {friendActionLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons
                    name={isFriend ? 'people' : isIncomingRequest ? 'person-add' : isOutgoingRequest ? 'time-outline' : 'person-add-outline'}
                    size={17}
                    color={Colors.primary}
                  />
                )}
                <Text style={styles.friendBtnText}>
                  {isFriend
                    ? t('friendProfile.friends')
                    : isIncomingRequest
                      ? t('friendProfile.confirmFriend')
                      : isOutgoingRequest
                        ? t('friendProfile.requestPending')
                        : t('friendProfile.addFriend')}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={onMessage} style={styles.messageBtn} activeOpacity={0.88}>
              <LinearGradient
                colors={Gradients.primary}
                style={styles.messageGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.white} />
                <Text style={styles.messageText}>{t('friendProfile.message')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <ProfileMomentsGrid
          posts={posts}
          title={t('friendProfile.moments')}
          emptyTitle={t('friendProfile.noMoments')}
          emptySub={t('friendProfile.noMomentsDesc')}
          onPostPress={post => {
            if (!profile) return;
            setSelectedPost(toPostView(post, profile.displayName, profile.avatarUrl));
          }}
        />
      </ScrollView>

      {selectedPost && (
        <PostSheet post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2DAF0',
      },
      default: {},
    }),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroWrap: {
    height: 160,
    backgroundColor: Colors.primarySoft,
  },
  heroBg: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginTop: -48,
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 18,
    ...Shadows.float,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorRow: {
    marginBottom: 12,
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.white,
    marginTop: -36,
    backgroundColor: Colors.primaryTint,
  },
  info: {
    flex: 1,
    paddingTop: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  titlePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#F8E9FF',
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  favoriteRow: {
    gap: 8,
    marginTop: 12,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  favoriteText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  username: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textDark,
    marginTop: 8,
  },
  joined: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    paddingVertical: 10,
    gap: 2,
  },
  statNum: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  friendBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft,
    backgroundColor: Colors.primaryTint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  friendBtnPassive: {
    backgroundColor: '#F7F4FF',
  },
  friendBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  messageGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
});

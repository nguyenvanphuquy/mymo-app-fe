import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  Platform, ActivityIndicator,
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
import { filterActivePosts } from '../utils/postExpiration';
import { formatDateOnlyDisplay } from '../utils/dateOnly';
import ProfileMomentsGrid from '../components/ProfileMomentsGrid';
import PostSheet from '../components/PostSheet';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&fit=crop';
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';

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

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, postsData] = await Promise.all([
        getUserPublicProfile(userId),
        getUserPosts(userId),
      ]);
      setProfile(profileData);
      setPosts(filterActivePosts(postsData));
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

  const name = profile?.displayName || initialName || t('friends.someone');
  const avatar = profile?.avatarUrl || initialAvatar || FALLBACK_AVATAR;
  const cover = profile?.coverUrl || FALLBACK_COVER;

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
          <Image source={{ uri: cover }} style={styles.heroBg} />
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

        <View style={styles.card}>
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
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name}>{name}</Text>
              {profile?.username ? (
                <Text style={styles.username}>@{profile.username}</Text>
              ) : null}
              {profile && (
                <View style={styles.metaRow}>
                  {profile.gender ? <Text style={styles.metaText}>{profile.gender}</Text> : null}
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

          <View style={styles.statsRow}>
            {stats.map(stat => (
              <View key={stat.l} style={styles.statBox}>
                <Ionicons name={stat.icon} size={14} color={Colors.primary} />
                <Text style={styles.statNum}>{stat.n}</Text>
                <Text style={styles.statLabel}>{stat.l}</Text>
              </View>
            ))}
          </View>

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
        borderColor: '#EBE8F5',
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
  name: {
    fontSize: 18,
    fontWeight: '800',
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
  messageBtn: {
    marginTop: 14,
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

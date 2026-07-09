import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import FriendStoryViewer from './FriendStoryViewer';
import {
  getFriendsFeed,
  getFeed,
} from '../services/postApi';
import {
  groupPostsByUser,
  getGroupThumbnail,
  type UserMomentGroup,
} from '../utils/friendMomentsGrouping';
import { filterActivePosts } from '../utils/postExpiration';

interface FriendMomentsSectionProps {
  friendNames: Record<string, { name: string; avatar?: string | null }>;
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop';

export default function FriendMomentsSection({ friendNames }: FriendMomentsSectionProps) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<UserMomentGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UserMomentGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    const friendIds = new Set(Object.keys(friendNames));
    try {
      const feed = await getFriendsFeed();
      setGroups(groupPostsByUser(filterActivePosts(feed), friendNames));
    } catch {
      try {
        const feed = await getFeed();
        setGroups(groupPostsByUser(
          filterActivePosts(feed.filter(p => friendIds.has(p.userId))),
          friendNames,
        ));
      } catch {
        setGroups([]);
      }
    } finally {
      setLoading(false);
    }
  }, [friendNames]);

  useEffect(() => {
    loadPosts();
    const sub = DeviceEventEmitter.addListener('post:created', loadPosts);
    return () => sub.remove();
  }, [loadPosts]);

  const visibleGroups = useMemo(() => groups.filter(g => g.count > 0), [groups]);

  if (loading || visibleGroups.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="images-outline" size={16} color={Colors.primary} />
        <Text style={styles.title}>{t('friends.moments')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {visibleGroups.map(group => {
          const thumb = getGroupThumbnail(group);
          const avatar = group.avatarUrl || FALLBACK_AVATAR;

          return (
            <TouchableOpacity
              key={group.userId}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => setSelectedGroup(group)}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={styles.thumbFallback}>
                  <Ionicons name="image-outline" size={28} color={Colors.primary} />
                </View>
              )}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.cardGradient}
              />

              <View style={styles.avatarRing}>
                <Image source={{ uri: avatar }} style={styles.avatar} />
              </View>

              {group.count > 1 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{group.count}</Text>
                </View>
              )}

              <Text style={styles.author} numberOfLines={1}>
                {group.displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FriendStoryViewer
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDF8',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 112,
    height: 198,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.primaryTint,
    ...Shadows.soft,
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryTint,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  avatarRing: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEE',
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  author: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 12,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

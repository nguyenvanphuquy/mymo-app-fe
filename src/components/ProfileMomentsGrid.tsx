import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { FeedPost } from '../services/postApi';
import { getPostThumbnail } from '../services/postApi';

const COLS = 3;
const GAP = 6;
const H_PAD = 16;
const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW, 500);
const TILE = (CARD_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

interface ProfileMomentsGridProps {
  posts: FeedPost[];
  onPostPress: (post: FeedPost) => void;
  title?: string;
  emptyTitle?: string;
  emptySub?: string;
}

export default function ProfileMomentsGrid({
  posts,
  onPostPress,
  title,
  emptyTitle,
  emptySub,
}: ProfileMomentsGridProps) {
  const { t } = useI18n();
  const gridTitle = title ?? t('profile.myMoments');
  const gridEmptyTitle = emptyTitle ?? t('profile.noMoments');
  const gridEmptySub = emptySub ?? t('profile.noMomentsDesc');

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="grid-outline" size={16} color={Colors.primary} />
        <Text style={styles.title}>{gridTitle}</Text>
        <Text style={styles.count}>{posts.length}</Text>
      </View>

      {posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={28} color={Colors.primaryLight} />
          <Text style={styles.emptyTitle}>{gridEmptyTitle}</Text>
          <Text style={styles.emptySub}>{gridEmptySub}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {posts.map(post => {
            const thumb = getPostThumbnail(post);
            return (
              <TouchableOpacity
                key={post.postId}
                style={styles.tile}
                activeOpacity={0.85}
                onPress={() => onPostPress(post)}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="image-outline" size={22} color={Colors.primary} />
                  </View>
                )}
                {post.visibility === 'Friends' && (
                  <View style={styles.visBadge}>
                    <Ionicons name="people" size={10} color={Colors.white} />
                  </View>
                )}
                {post.visibility === 'Anonymous' && (
                  <View style={[styles.visBadge, styles.anonBadge]}>
                    <Ionicons name="eye-off" size={10} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F6F5FC',
    ...Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.primaryTint,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(124,91,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anonBadge: {
    backgroundColor: 'rgba(60,60,80,0.9)',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  emptySub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

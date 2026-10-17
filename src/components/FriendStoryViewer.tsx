import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Image,
  SafeAreaView, Pressable, useWindowDimensions, Platform, PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { APP_MAX_WIDTH, useAppContentWidth } from '../constants/layout';
import PostSheet from './PostSheet';
import { getPostThumbnail, toPostView } from '../services/postApi';
import MomentMedia, { isVideoMedia } from './MomentMedia';
import type { UserMomentGroup } from '../utils/friendMomentsGrouping';
import { avatarUri } from '../constants/defaultAvatar';
import { openUserProfile } from '../utils/openUserProfile';
import { recordStoryView } from '../services/postApi';
import MomentViewers from './MomentViewers';

interface FriendStoryViewerProps {
  groups: UserMomentGroup[];
  initialGroupIndex: number | null;
  viewerUserId?: string | null;
  onStoryViewed?: (postId: string) => void;
  onClose: () => void;
}

export default function FriendStoryViewer({
  groups,
  initialGroupIndex,
  viewerUserId = null,
  onStoryViewed,
  onClose,
}: FriendStoryViewerProps) {
  const appWidth = useAppContentWidth();
  const { height: windowHeight } = useWindowDimensions();
  const [groupIndex, setGroupIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [viewersOpen, setViewersOpen] = useState(false);

  const group = groups[groupIndex] ?? null;
  const posts = group?.posts ?? [];
  const currentPost = posts[activeIndex];

  useEffect(() => {
    if (initialGroupIndex == null) return;
    setGroupIndex(initialGroupIndex);
    setActiveIndex(0);
    setProgress(0);
    setDetailPostId(null);
  }, [initialGroupIndex]);

  const isOwnStory = !!viewerUserId && group?.userId === viewerUserId.toLowerCase();

  useEffect(() => {
    if (!currentPost) return;
    onStoryViewed?.(currentPost.postId);
    if (!isOwnStory) void recordStoryView(currentPost.postId).catch(() => {});
  }, [currentPost?.postId, onStoryViewed, isOwnStory]);

  const goNext = useCallback(() => {
    if (activeIndex < posts.length - 1) {
      setActiveIndex(prev => prev + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setActiveIndex(0);
      return;
    }
    onClose();
  }, [activeIndex, posts.length, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
      return;
    }
    if (groupIndex > 0) {
      const previousGroupIndex = groupIndex - 1;
      setGroupIndex(previousGroupIndex);
      setActiveIndex(Math.max(0, groups[previousGroupIndex].posts.length - 1));
    }
  }, [activeIndex, groupIndex, groups]);

  const swipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy)
    ),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx <= -45) goNext();
      else if (gesture.dx >= 45) goPrev();
    },
  }), [goNext, goPrev]);

  useEffect(() => {
    if (!group || posts.length === 0 || viewersOpen) return;

    setProgress(0);
    const startedAt = Date.now();
    const duration = 5000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / duration);
      setProgress(ratio);

      if (ratio >= 1) {
        goNext();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [group, activeIndex, posts.length, goNext, viewersOpen]);

  const detailPost = useMemo(() => {
    if (!detailPostId || !group) return null;
    const post = posts.find(p => p.postId === detailPostId);
    if (!post) return null;
    return toPostView(post, group.displayName, group.avatarUrl);
  }, [detailPostId, group, posts]);

  if (!group || !currentPost) return null;

  const thumb = getPostThumbnail(currentPost);
  const clip = currentPost.media?.[0];
  const video = isVideoMedia(clip?.mediaType, clip?.url);
  const playUri = video && Platform.OS === 'web' ? (clip?.url || thumb) : thumb;
  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <SafeAreaView
            style={[styles.modal, { width: appWidth, maxWidth: APP_MAX_WIDTH, height: windowHeight }]}
            {...swipeResponder.panHandlers}
          >
            <View style={styles.mediaStage}>
              {playUri ? (
                video ? (
                  <MomentMedia uri={playUri} mediaType="Video" style={styles.fullImage} resizeMode="contain" />
                ) : (
                  <Image
                    source={{ uri: playUri }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                )
              ) : (
                <View style={styles.fullFallback}>
                  <Ionicons name="image-outline" size={48} color={Colors.primary} />
                </View>
              )}
            </View>

            <Pressable style={styles.tapLeft} onPress={goPrev} />
            <Pressable style={styles.tapRight} onPress={goNext} />

            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.25)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={styles.header}>
              <View style={styles.progressRow}>
                {posts.map((post, index) => (
                  <View key={`${post.postId}-${index}`} style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: index < activeIndex
                            ? '100%'
                            : index === activeIndex
                            ? `${progress * 100}%`
                            : '0%',
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.userRow}>
                <TouchableOpacity
                  onPress={() => openUserProfile({
                    userId: group.userId,
                    displayName: group.displayName,
                    avatarUrl: group.avatarUrl,
                  })}
                  activeOpacity={0.75}
                >
                  <Image
                    source={{
                      uri: avatarUri(group.avatarUrl),
                    }}
                    style={styles.userAvatar}
                  />
                </TouchableOpacity>
                <View style={styles.userInfo}>
                  <TouchableOpacity
                    onPress={() => openUserProfile({
                      userId: group.userId,
                      displayName: group.displayName,
                      avatarUrl: group.avatarUrl,
                    })}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.userName} numberOfLines={1}>{group.displayName}</Text>
                  </TouchableOpacity>
                  <Text style={styles.userMeta}>
                    {activeIndex + 1}/{posts.length} · {new Date(currentPost.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              {isOwnStory ? (
                <MomentViewers postId={currentPost.postId} onOpenChange={setViewersOpen} />
              ) : null}
              {currentPost.caption ? (
                <Text style={styles.caption} numberOfLines={3}>{currentPost.caption}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.openPostBtn}
                onPress={() => setDetailPostId(currentPost.postId)}
              >
                <Text style={styles.openPostText}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {detailPost && (
        <PostSheet post={detailPost} onClose={() => setDetailPostId(null)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: '100vw',
      },
      default: {},
    }),
  },
  modal: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  mediaStage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
  },
  fullFallback: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    zIndex: 2,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
    zIndex: 2,
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    zIndex: 3,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  userMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 16,
    zIndex: 3,
  },
  caption: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  openPostBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  openPostText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated,
  Platform, Image, ActivityIndicator, ScrollView, TextInput,
  KeyboardAvoidingView, DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../constants/colors';
import { useAppContentWidth } from '../constants/layout';
import { useI18n } from '../i18n';
import {
  getPostById,
  likePost,
  unlikePost,
  deletePost,
  type PostDetail,
  type PostView,
} from '../services/postApi';
import {
  getPostComments,
  createComment,
  replyComment,
  deleteComment,
  type Comment,
} from '../services/commentApi';
import { getStoredAuthSession } from '../services/authApi';

interface PostSheetProps {
  post: PostView;
  onClose: () => void;
  isOwnPost?: boolean;
}

function sameUserId(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function formatCaption(caption: string | null | undefined, t: (key: string) => string): string {
  if (!caption) return t('post.noCaption');
  if (caption.startsWith('cam.')) {
    return t(caption as Parameters<typeof t>[0]);
  }
  return caption;
}

function displayUserName(user: Comment['user']): string {
  return user.displayName || user.username || 'User';
}

function CommentRow({
  comment,
  depth = 0,
  currentUserId,
  onReply,
  onDelete,
  t,
}: {
  comment: Comment;
  depth?: number;
  currentUserId: string | null;
  onReply: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
  t: (key: string) => string;
}) {
  const name = displayUserName(comment.user);
  const isOwner = currentUserId === comment.userId;
  const isNested = depth > 0;
  const avatarSize = depth === 0 ? 28 : depth === 1 ? 22 : 18;
  const iconSize = depth === 0 ? 12 : depth === 1 ? 10 : 9;

  return (
    <View style={[styles.commentRow, isNested && styles.replyRow]}>
      <View style={[styles.commentAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
        {comment.user.avatarUrl ? (
          <Image source={{ uri: comment.user.avatarUrl }} style={styles.commentAvatarImage} />
        ) : (
          <Ionicons name="person" size={iconSize} color={Colors.primary} />
        )}
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentName, isNested && styles.commentNameNested]}>{name}</Text>
          <Text style={styles.commentDate}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.commentContent, isNested && styles.commentContentNested]}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => onReply(comment)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.commentActionText}>{t('post.reply')}</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity onPress={() => onDelete(comment)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.commentActionText, styles.commentDeleteText]}>{t('post.deleteComment')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {comment.replies.map(reply => (
          <CommentRow
            key={reply.commentId}
            comment={reply}
            depth={depth + 1}
            currentUserId={currentUserId}
            onReply={onReply}
            onDelete={onDelete}
            t={t}
          />
        ))}
      </View>
    </View>
  );
}

export default function PostSheet({ post, onClose, isOwnPost = false }: PostSheetProps) {
  const { t } = useI18n();
  const appWidth = useAppContentWidth();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const useNativeDriver = Platform.OS !== 'web';
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [recalling, setRecalling] = useState(false);
  const [recallConfirmOpen, setRecallConfirmOpen] = useState(false);

  const contentPad = 24;
  const mediaSize = appWidth - contentPad * 2;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim, useNativeDriver]);

  useEffect(() => {
    getStoredAuthSession().then(session => {
      setCurrentUserId(session?.userId ?? null);
    });
  }, []);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const data = await getPostComments(post.postId);
      setComments(data);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [post.postId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getPostById(post.postId),
      getPostComments(post.postId).catch(() => [] as Comment[]),
    ])
      .then(([postData, commentData]) => {
        if (!cancelled) {
          setDetail(postData);
          setIsLiked(postData.isLiked);
          setLikeCount(postData.likeCount);
          setCommentCount(postData.commentCount);
          setComments(commentData);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load post');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setCommentsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [post.postId]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver,
    }).start(onClose);
  };

  const toggleLike = useCallback(async () => {
    if (liking) return;

    const wasLiked = isLiked;
    setLiking(true);
    setIsLiked(!wasLiked);
    setLikeCount(prev => Math.max(0, wasLiked ? prev - 1 : prev + 1));

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      if (wasLiked) {
        await unlikePost(post.postId);
        Toast.show({ type: 'info', text1: t('post.unliked') });
      } else {
        await likePost(post.postId);
        Toast.show({ type: 'success', text1: t('post.liked') });
      }
      setDetail(prev => prev ? { ...prev, isLiked: !wasLiked, likeCount: wasLiked ? prev.likeCount - 1 : prev.likeCount + 1 } : prev);
    } catch (err) {
      setIsLiked(wasLiked);
      setLikeCount(prev => Math.max(0, wasLiked ? prev + 1 : prev - 1));
      const message = err instanceof Error ? err.message : t('post.likeError');
      if (message.toLowerCase().includes('unauthorized') || message.includes('401')) {
        Toast.show({ type: 'error', text1: t('post.loginToLike') });
      } else {
        Toast.show({ type: 'error', text1: message });
      }
    } finally {
      setLiking(false);
    }
  }, [isLiked, liking, post.postId, t]);

  const toggleComments = () => {
    setShowComments(prev => !prev);
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setShowComments(true);
  };

  const cancelReply = () => setReplyTo(null);

  const countDeletedComments = (comment: Comment): number =>
    1 + comment.replies.reduce((sum, reply) => sum + countDeletedComments(reply), 0);

  const handleDeleteComment = useCallback(async (comment: Comment) => {
    try {
      await deleteComment(comment.commentId);
      const removedCount = countDeletedComments(comment);
      setCommentCount(prev => Math.max(0, prev - removedCount));
      setDetail(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - removedCount) } : prev);
      await loadComments();
      Toast.show({ type: 'success', text1: t('post.commentDeleted') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('post.commentError');
      Toast.show({ type: 'error', text1: message });
    }
  }, [loadComments, t]);

  const submitComment = useCallback(async () => {
    const content = commentText.trim();
    if (!content || submittingComment) return;

    setSubmittingComment(true);
    try {
      if (replyTo) {
        await replyComment(replyTo.commentId, content);
      } else {
        await createComment(post.postId, content);
      }

      setCommentText('');
      setReplyTo(null);
      setCommentCount(prev => prev + 1);
      setDetail(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
      setShowComments(true);
      await loadComments();
      Toast.show({ type: 'success', text1: t('post.commentPosted') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('post.commentError');
      if (message.toLowerCase().includes('unauthorized') || message.includes('401')) {
        Toast.show({ type: 'error', text1: t('post.loginToComment') });
      } else {
        Toast.show({ type: 'error', text1: message });
      }
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, submittingComment, replyTo, post.postId, loadComments, t]);

  const isPostOwner = isOwnPost || sameUserId(currentUserId, detail?.owner?.userId);

  const performRecall = useCallback(async () => {
    if (recalling) return;
    setRecallConfirmOpen(false);
    setRecalling(true);
    try {
      await deletePost(post.postId);
      DeviceEventEmitter.emit('post:deleted');
      Toast.show({ type: 'success', text1: t('post.recalled') });
      close();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('post.recallError'),
      });
    } finally {
      setRecalling(false);
    }
  }, [recalling, post.postId, t]);

  const handleRecallPost = useCallback(() => {
    setRecallConfirmOpen(true);
  }, []);

  const owner = detail?.owner;
  const isAnonymous = detail?.visibility === 'Anonymous';
  const displayName = owner?.displayName || owner?.username || post.displayName;
  const avatarUrl = owner?.avatarUrl ?? post.avatarUrl;
  const showUsername = owner?.username && owner.username !== 'anonymous';
  const caption = formatCaption(detail?.caption ?? post.caption, t);
  const primaryMedia = detail?.media?.[0];
  const imageUrl = primaryMedia?.url || primaryMedia?.thumbnailUrl || post.thumbnailUrl;
  const viewCount = detail?.viewCount ?? 0;
  const shareCount = detail?.shareCount ?? 0;

  return (
    <>
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
      <KeyboardAvoidingView
        style={styles.sheetOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.sheet,
            { width: appWidth, maxHeight: '88%', transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons
                  name={isAnonymous ? 'eye-off-outline' : 'person'}
                  size={16}
                  color={Colors.primary}
                />
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{displayName}</Text>
              {isAnonymous ? (
                <Text style={styles.username}>{t('post.anonymous')}</Text>
              ) : showUsername ? (
                <Text style={styles.username}>@{owner?.username}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={close} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {loading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.loadingText}>{t('post.loading')}</Text>
              </View>
            )}

            {error && !loading && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {imageUrl && !loading && (
              <View style={[styles.mediaWrap, { width: mediaSize, height: mediaSize }]}>
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: mediaSize, height: mediaSize }}
                  resizeMode="cover"
                />
              </View>
            )}

            {!loading && (
              <>
                <Text style={styles.caption} numberOfLines={2}>{caption}</Text>

                {detail?.place && (
                  <View style={styles.placeRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.primary} />
                    <Text style={styles.placeName} numberOfLines={1}>
                      {detail.place.name}
                      {detail.place.city ? ` · ${detail.place.city}` : ''}
                    </Text>
                  </View>
                )}

                <View style={styles.stats}>
                  <TouchableOpacity
                    onPress={toggleLike}
                    disabled={liking}
                    style={[styles.likeBtn, isLiked && styles.likeBtnActive]}
                    activeOpacity={0.8}
                  >
                    {liking ? (
                      <ActivityIndicator size="small" color={isLiked ? '#EF4444' : Colors.primary} />
                    ) : (
                      <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isLiked ? '#EF4444' : Colors.primary}
                      />
                    )}
                    <Text style={[styles.statText, isLiked && styles.likeTextActive]}>
                      {likeCount}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={toggleComments} style={styles.stat} activeOpacity={0.8}>
                    <Ionicons
                      name={showComments ? 'chatbubble' : 'chatbubble-outline'}
                      size={15}
                      color={Colors.primary}
                    />
                    <Text style={styles.statText}>{commentCount}</Text>
                  </TouchableOpacity>

                  <View style={styles.stat}>
                    <Ionicons name="eye-outline" size={15} color={Colors.primary} />
                    <Text style={styles.statText}>{viewCount}</Text>
                  </View>
                  {shareCount > 0 && (
                    <View style={styles.stat}>
                      <Ionicons name="share-social-outline" size={15} color={Colors.primary} />
                      <Text style={styles.statText}>{shareCount}</Text>
                    </View>
                  )}
                  {detail?.createdAt && (
                    <Text style={styles.dateText}>
                      {new Date(detail.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {isPostOwner && (
                  <TouchableOpacity
                    onPress={handleRecallPost}
                    disabled={recalling}
                    style={styles.recallBtn}
                    activeOpacity={0.85}
                  >
                    {recalling ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    )}
                    <Text style={styles.recallBtnText}>{t('post.recall')}</Text>
                  </TouchableOpacity>
                )}

                {showComments && (
                  <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>{t('post.comments')}</Text>
                    {commentsLoading ? (
                      <ActivityIndicator color={Colors.primary} size="small" style={styles.commentsLoader} />
                    ) : comments.length === 0 ? (
                      <Text style={styles.noComments}>{t('post.noComments')}</Text>
                    ) : (
                      comments.map(comment => (
                        <CommentRow
                          key={comment.commentId}
                          comment={comment}
                          currentUserId={currentUserId}
                          onReply={handleReply}
                          onDelete={handleDeleteComment}
                          t={t}
                        />
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {!loading && (
            <View style={styles.inputSection}>
              {replyTo && (
                <View style={styles.replyBanner}>
                  <Text style={styles.replyBannerText} numberOfLines={1}>
                    {t('post.replyingTo')} {displayUserName(replyTo.user)}
                  </Text>
                  <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={t('post.commentPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={2000}
                  onFocus={() => setShowComments(true)}
                />
                <TouchableOpacity
                  onPress={submitComment}
                  disabled={!commentText.trim() || submittingComment}
                  style={[
                    styles.sendBtn,
                    (!commentText.trim() || submittingComment) && styles.sendBtnDisabled,
                  ]}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Ionicons name="send" size={16} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal
      visible={recallConfirmOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setRecallConfirmOpen(false)}
    >
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>{t('post.recallConfirmTitle')}</Text>
          <Text style={styles.confirmMessage}>{t('post.recallConfirmMessage')}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelBtn}
              onPress={() => setRecallConfirmOpen(false)}
              disabled={recalling}
            >
              <Text style={styles.confirmCancelText}>{t('post.recallCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmDeleteBtn}
              onPress={performRecall}
              disabled={recalling}
            >
              {recalling ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.confirmDeleteText}>{t('post.recallConfirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42,23,88,0.35)',
  },
  sheetOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'web' ? 16 : 24,
    ...Shadows.float,
  },
  scrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primarySoft,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  username: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 10,
  },
  mediaWrap: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.primaryTint,
    marginBottom: 12,
    ...Shadows.soft,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textDark,
    marginBottom: 10,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  placeName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
    marginBottom: 8,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryTint,
  },
  likeBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  likeTextActive: {
    color: '#EF4444',
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  recallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  recallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42,23,88,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
    ...Shadows.float,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  commentsSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryTint,
  },
  commentsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
  },
  commentsLoader: {
    marginVertical: 12,
  },
  noComments: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  replyRow: {
    marginTop: 8,
    marginBottom: 0,
    paddingLeft: 4,
  },
  commentAvatar: {
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  commentName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  commentNameNested: {
    fontSize: 11,
  },
  commentDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  commentContent: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textDark,
  },
  commentContentNested: {
    fontSize: 11,
    lineHeight: 16,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  commentActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  commentDeleteText: {
    color: '#EF4444',
  },
  inputSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.primaryTint,
    paddingTop: 10,
    marginTop: 4,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryTint,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginRight: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 90,
    borderRadius: 18,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 13,
    color: Colors.textDark,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated,
  Platform, Image, ActivityIndicator, ScrollView, TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, Shadows } from '../constants/colors';
import { useAppContentWidth } from '../constants/layout';
import { useI18n } from '../i18n';
import {
  getPlaceDetail,
  getPlaceReviews,
  createReview,
  deleteReview,
  type PlaceDetail,
  type PlaceRecentPost,
  type PlaceRecentReview,
  type ReviewItem,
} from '../services/placeApi';
import { getStoredAuthSession } from '../services/authApi';

interface PlaceSheetProps {
  placeId: string;
  placeName?: string;
  onClose: () => void;
  onPostTap?: (post: PlaceRecentPost) => void;
}

function StarRating({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          disabled={!onChange}
          onPress={() => onChange?.(star)}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? '#FBBF24' : Colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function displayName(user: { displayName: string | null; userId: string }): string {
  return user.displayName || 'User';
}

export default function PlaceSheet({ placeId, placeName, onClose, onPostTap }: PlaceSheetProps) {
  const { t } = useI18n();
  const appWidth = useAppContentWidth();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const useNativeDriver = Platform.OS !== 'web';

  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [placeData, reviewData] = await Promise.all([
        getPlaceDetail(placeId),
        getPlaceReviews(placeId).catch(() => [] as ReviewItem[]),
      ]);
      setDetail(placeData);
      setReviews(reviewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load place');
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver,
    }).start(onClose);
  };

  const myReview = currentUserId
    ? reviews.find(r => r.user.userId === currentUserId)
    : undefined;

  const displayReviews: (PlaceRecentReview | ReviewItem)[] = showAllReviews
    ? reviews
    : (detail?.recentReviews ?? []);

  const submitReview = async () => {
    if (submitting || myReview) return;
    if (!content.trim() && !title.trim()) {
      Toast.show({ type: 'error', text1: t('place.reviewRequired') });
      return;
    }

    setSubmitting(true);
    try {
      await createReview(placeId, {
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
      });
      setTitle('');
      setContent('');
      setRating(5);
      await loadData();
      Toast.show({ type: 'success', text1: t('place.reviewPosted') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('place.reviewError');
      if (message.toLowerCase().includes('unauthorized') || message.includes('401')) {
        Toast.show({ type: 'error', text1: t('place.loginToReview') });
      } else {
        Toast.show({ type: 'error', text1: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      await loadData();
      Toast.show({ type: 'success', text1: t('place.reviewDeleted') });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('place.reviewError'),
      });
    }
  };

  const name = detail?.name || placeName || t('place.loading');

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
      <KeyboardAvoidingView
        style={styles.sheetOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.sheet,
            { width: appWidth, maxHeight: '90%', transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>{t('place.loading')}</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
                <Text style={styles.retryText}>{t('place.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && detail && (
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Hero */}
              <View style={styles.hero}>
                <View style={styles.heroThumb}>
                  {detail.thumbnailUrl || detail.business?.logoUrl ? (
                    <Image
                      source={{ uri: detail.thumbnailUrl || detail.business?.logoUrl || '' }}
                      style={styles.heroImage}
                    />
                  ) : (
                    <Ionicons name="location" size={28} color={Colors.primary} />
                  )}
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.placeName}>{name}</Text>
                  {detail.category && (
                    <View style={styles.categoryRow}>
                      <Ionicons name="pricetag-outline" size={12} color={Colors.primary} />
                      <Text style={styles.categoryText}>{detail.category.name}</Text>
                    </View>
                  )}
                  {detail.business?.verified && (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                      <Text style={styles.verifiedText}>{detail.business.name}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={close} style={styles.closeBtn}>
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Rating + stats */}
              <View style={styles.statsCard}>
                <View style={styles.ratingBlock}>
                  <Text style={styles.ratingValue}>{detail.averageRating.toFixed(1)}</Text>
                  <StarRating value={Math.round(detail.averageRating)} size={14} />
                  <Text style={styles.ratingCount}>
                    {detail.reviewCount} {t('place.reviews')}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>{detail.checkInCount}</Text>
                  <Text style={styles.statLabel}>{t('place.checkIns')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>{detail.postCount}</Text>
                  <Text style={styles.statLabel}>{t('place.posts')}</Text>
                </View>
              </View>

              {/* Address & hours */}
              {(detail.address || detail.city) && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color={Colors.primary} />
                  <Text style={styles.infoText}>
                    {[detail.address, detail.ward, detail.district, detail.city, detail.country]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              )}
              {detail.openingHours && (
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.infoText}>{detail.openingHours}</Text>
                </View>
              )}
              {detail.description && (
                <Text style={styles.description}>{detail.description}</Text>
              )}

              {/* Recent posts */}
              {detail.recentPosts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('place.recentPosts')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {detail.recentPosts.map(post => (
                      <TouchableOpacity
                        key={post.postId}
                        style={styles.postCard}
                        onPress={() => onPostTap?.(post)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.postThumb}>
                          {post.mediaUrl ? (
                            <Image source={{ uri: post.mediaUrl }} style={styles.postThumbImg} />
                          ) : (
                            <Ionicons name="image-outline" size={20} color={Colors.primary} />
                          )}
                        </View>
                        <Text style={styles.postCaption} numberOfLines={2}>
                          {post.caption || t('post.noCaption')}
                        </Text>
                        <Text style={styles.postMeta}>
                          {displayName(post.user)} · ❤️ {post.likeCount}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Reviews */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('place.reviews')}</Text>
                  {reviews.length > (detail.recentReviews?.length ?? 0) && (
                    <TouchableOpacity onPress={() => setShowAllReviews(v => !v)}>
                      <Text style={styles.seeAllText}>
                        {showAllReviews ? t('place.showLess') : t('place.seeAll')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {displayReviews.length === 0 ? (
                  <Text style={styles.emptyText}>{t('place.noReviews')}</Text>
                ) : (
                  displayReviews.map(review => {
                    const isOwner = currentUserId === review.user.userId;
                    return (
                      <View key={review.reviewId} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewAvatar}>
                            {review.user.avatarUrl ? (
                              <Image source={{ uri: review.user.avatarUrl }} style={styles.reviewAvatarImg} />
                            ) : (
                              <Ionicons name="person" size={12} color={Colors.primary} />
                            )}
                          </View>
                          <View style={styles.reviewMeta}>
                            <Text style={styles.reviewName}>{displayName(review.user)}</Text>
                            <StarRating value={review.rating} size={12} />
                          </View>
                          {isOwner && (
                            <TouchableOpacity
                              onPress={() => handleDeleteReview(review.reviewId)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                        {review.title ? (
                          <Text style={styles.reviewTitle}>{review.title}</Text>
                        ) : null}
                        {review.content ? (
                          <Text style={styles.reviewContent}>{review.content}</Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>

              {/* Write review */}
              {!myReview && (
                <View style={styles.reviewForm}>
                  <Text style={styles.sectionTitle}>{t('place.writeReview')}</Text>
                  <Text style={styles.formLabel}>{t('place.yourRating')}</Text>
                  <StarRating value={rating} onChange={setRating} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('place.reviewTitlePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={200}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t('place.reviewContentPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={2000}
                  />
                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={submitReview}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.submitText}>{t('place.submitReview')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {myReview && (
                <View style={styles.alreadyReviewed}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.alreadyReviewedText}>{t('place.alreadyReviewed')}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 20 : 28,
    ...Shadows.float,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primarySoft,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  scrollBody: { flexShrink: 1 },
  scrollContent: { paddingBottom: 16 },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  errorWrap: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  errorText: { fontSize: 13, color: '#EF4444' },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.primaryTint,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  heroThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.soft,
  },
  heroImage: { width: 64, height: 64 },
  heroInfo: { flex: 1 },
  placeName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryTint,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  ratingBlock: { flex: 1.2, alignItems: 'center' },
  ratingValue: { fontSize: 22, fontWeight: '800', color: Colors.textDark },
  starRow: { flexDirection: 'row', gap: 2, marginVertical: 2 },
  ratingCount: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.primarySoft },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  description: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 19,
    marginBottom: 12,
  },
  section: { marginTop: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
  },
  seeAllText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  emptyText: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  postCard: {
    width: 120,
    marginRight: 10,
    backgroundColor: Colors.primaryTint,
    borderRadius: 12,
    padding: 8,
  },
  postThumb: {
    width: '100%',
    height: 72,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  postThumbImg: { width: '100%', height: '100%' },
  postCaption: { fontSize: 10, fontWeight: '600', color: Colors.textDark },
  postMeta: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  reviewCard: {
    backgroundColor: Colors.primaryTint,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  reviewAvatarImg: { width: 28, height: 28 },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  reviewTitle: { fontSize: 12, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  reviewContent: { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  reviewForm: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.primarySoft,
  },
  formLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 6 },
  input: {
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 13,
    color: Colors.textDark,
    marginTop: 8,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  submitBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  alreadyReviewed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    padding: 10,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  alreadyReviewedText: { fontSize: 12, fontWeight: '600', color: '#065F46' },
});

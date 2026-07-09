import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://beexe-production.up.railway.app/api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem('mymo.accessToken');
}

async function requestJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const rawText = await response.text();
  let data: unknown = rawText;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data
      ? String((data as { message?: unknown }).message)
      : 'Unable to complete request';
    throw new Error(message);
  }

  return data as T;
}

export interface PlaceSummary {
  id: string;
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  thumbnailUrl?: string | null;
  averageRating?: number;
  reviewCount?: number;
  address?: string | null;
  city?: string | null;
}

export interface PlaceDetailUser {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PlaceDetailCategory {
  categoryId: string;
  name: string;
  icon: string | null;
}

export interface PlaceDetailBusiness {
  businessId: string;
  name: string;
  logoUrl: string | null;
  verified: boolean;
}

export interface PlaceRecentPost {
  postId: string;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  mediaUrl: string | null;
  user: PlaceDetailUser;
}

export interface PlaceRecentReview {
  reviewId: string;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: string;
  user: PlaceDetailUser;
}

export interface PlaceDetail {
  placeId: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  ward: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  thumbnailUrl: string | null;
  averageRating: number;
  reviewCount: number;
  checkInCount: number;
  postCount: number;
  category: PlaceDetailCategory | null;
  business: PlaceDetailBusiness | null;
  recentPosts: PlaceRecentPost[];
  recentReviews: PlaceRecentReview[];
}

export interface ReviewItem {
  reviewId: string;
  placeId: string;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: string;
  updatedAt: string | null;
  user: PlaceDetailUser;
}

function normalizeUser(raw: Record<string, unknown>): PlaceDetailUser {
  return {
    userId: String(raw.userId ?? raw.UserId ?? ''),
    displayName: (raw.displayName ?? raw.DisplayName ?? null) as string | null,
    avatarUrl: (raw.avatarUrl ?? raw.AvatarUrl ?? null) as string | null,
  };
}

function normalizePlaceSummary(raw: Record<string, unknown>): PlaceSummary {
  const id = String(raw.placeId ?? raw.PlaceId ?? raw.id ?? '');
  return {
    id,
    placeId: id,
    name: String(raw.name ?? raw.Name ?? ''),
    latitude: Number(raw.latitude ?? raw.Latitude ?? 0),
    longitude: Number(raw.longitude ?? raw.Longitude ?? 0),
    thumbnailUrl: (raw.thumbnailUrl ?? raw.ThumbnailUrl ?? null) as string | null,
    averageRating: Number(raw.averageRating ?? raw.AverageRating ?? 0),
    reviewCount: Number(raw.reviewCount ?? raw.ReviewCount ?? 0),
    address: (raw.address ?? raw.Address ?? null) as string | null,
    city: (raw.city ?? raw.City ?? null) as string | null,
  };
}

function normalizeRecentPost(raw: Record<string, unknown>): PlaceRecentPost {
  const userRaw = (raw.user ?? raw.User ?? {}) as Record<string, unknown>;
  return {
    postId: String(raw.postId ?? raw.PostId ?? ''),
    caption: (raw.caption ?? raw.Caption ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    likeCount: Number(raw.likeCount ?? raw.LikeCount ?? 0),
    commentCount: Number(raw.commentCount ?? raw.CommentCount ?? 0),
    mediaUrl: (raw.mediaUrl ?? raw.MediaUrl ?? null) as string | null,
    user: normalizeUser(userRaw),
  };
}

function normalizeRecentReview(raw: Record<string, unknown>): PlaceRecentReview {
  const userRaw = (raw.user ?? raw.User ?? {}) as Record<string, unknown>;
  return {
    reviewId: String(raw.reviewId ?? raw.ReviewId ?? ''),
    rating: Number(raw.rating ?? raw.Rating ?? 0),
    title: (raw.title ?? raw.Title ?? null) as string | null,
    content: (raw.content ?? raw.Content ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    user: normalizeUser(userRaw),
  };
}

function normalizePlaceDetail(raw: Record<string, unknown>): PlaceDetail {
  const categoryRaw = raw.category ?? raw.Category;
  const businessRaw = raw.business ?? raw.Business;
  const postsRaw = (raw.recentPosts ?? raw.RecentPosts ?? []) as Record<string, unknown>[];
  const reviewsRaw = (raw.recentReviews ?? raw.RecentReviews ?? []) as Record<string, unknown>[];

  return {
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    address: (raw.address ?? raw.Address ?? null) as string | null,
    city: (raw.city ?? raw.City ?? null) as string | null,
    district: (raw.district ?? raw.District ?? null) as string | null,
    ward: (raw.ward ?? raw.Ward ?? null) as string | null,
    country: (raw.country ?? raw.Country ?? null) as string | null,
    latitude: Number(raw.latitude ?? raw.Latitude ?? 0),
    longitude: Number(raw.longitude ?? raw.Longitude ?? 0),
    openingHours: (raw.openingHours ?? raw.OpeningHours ?? null) as string | null,
    thumbnailUrl: (raw.thumbnailUrl ?? raw.ThumbnailUrl ?? null) as string | null,
    averageRating: Number(raw.averageRating ?? raw.AverageRating ?? 0),
    reviewCount: Number(raw.reviewCount ?? raw.ReviewCount ?? 0),
    checkInCount: Number(raw.checkInCount ?? raw.CheckInCount ?? 0),
    postCount: Number(raw.postCount ?? raw.PostCount ?? 0),
    category: categoryRaw
      ? {
          categoryId: String((categoryRaw as Record<string, unknown>).categoryId ?? (categoryRaw as Record<string, unknown>).CategoryId ?? (categoryRaw as Record<string, unknown>).placeCategoryId ?? ''),
          name: String((categoryRaw as Record<string, unknown>).name ?? (categoryRaw as Record<string, unknown>).Name ?? ''),
          icon: ((categoryRaw as Record<string, unknown>).icon ?? (categoryRaw as Record<string, unknown>).Icon ?? null) as string | null,
        }
      : null,
    business: businessRaw
      ? {
          businessId: String((businessRaw as Record<string, unknown>).businessId ?? (businessRaw as Record<string, unknown>).BusinessId ?? ''),
          name: String((businessRaw as Record<string, unknown>).name ?? (businessRaw as Record<string, unknown>).Name ?? ''),
          logoUrl: ((businessRaw as Record<string, unknown>).logoUrl ?? (businessRaw as Record<string, unknown>).LogoUrl ?? null) as string | null,
          verified: Boolean((businessRaw as Record<string, unknown>).verified ?? (businessRaw as Record<string, unknown>).Verified ?? false),
        }
      : null,
    recentPosts: postsRaw.map(normalizeRecentPost),
    recentReviews: reviewsRaw.map(normalizeRecentReview),
  };
}

function normalizeReview(raw: Record<string, unknown>): ReviewItem {
  const userRaw = (raw.user ?? raw.User ?? {}) as Record<string, unknown>;
  return {
    reviewId: String(raw.reviewId ?? raw.ReviewId ?? ''),
    placeId: String(raw.placeId ?? raw.PlaceId ?? ''),
    rating: Number(raw.rating ?? raw.Rating ?? 0),
    title: (raw.title ?? raw.Title ?? null) as string | null,
    content: (raw.content ?? raw.Content ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? null) as string | null,
    user: normalizeUser(userRaw),
  };
}

/** @deprecated use PlaceSummary */
export type PlaceResult = PlaceSummary;

export async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusKm = 5,
): Promise<PlaceSummary[]> {
  const query = `?Latitude=${latitude}&Longitude=${longitude}&RadiusKm=${radiusKm}`;
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>(`/places/nearby${query}`, 'GET');
  return (response.data ?? []).map(item => normalizePlaceSummary(item));
}

export async function getPlaceDetail(placeId: string): Promise<PlaceDetail> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(`/places/${placeId}/detail`, 'GET');
  if (!response.success) {
    throw new Error(response.message || 'Unable to load place detail');
  }
  return normalizePlaceDetail(response.data);
}

export async function getPlaceReviews(placeId: string): Promise<ReviewItem[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>(`/places/${placeId}/reviews`, 'GET');
  if (!response.success) {
    throw new Error(response.message || 'Unable to load reviews');
  }
  return (response.data ?? []).map(item => normalizeReview(item));
}

export async function createReview(
  placeId: string,
  payload: { rating: number; title?: string; content?: string },
): Promise<ReviewItem> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(
    `/places/${placeId}/reviews`,
    'POST',
    payload,
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to create review');
  }
  return normalizeReview(response.data);
}

export async function updateReview(
  reviewId: string,
  payload: { rating: number; title?: string; content?: string },
): Promise<ReviewItem> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(
    `/reviews/${reviewId}`,
    'PUT',
    payload,
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to update review');
  }
  return normalizeReview(response.data);
}

export async function deleteReview(reviewId: string): Promise<void> {
  const response = await requestJson<ApiResponse<boolean>>(`/reviews/${reviewId}`, 'DELETE');
  if (!response.success) {
    throw new Error(response.message || 'Unable to delete review');
  }
}

export function pickClosestPlace(places: PlaceSummary[]): PlaceSummary | null {
  if (!places || places.length === 0) return null;
  return places[0];
}

export function recentPostToPostView(post: PlaceRecentPost) {
  return {
    postId: post.postId,
    displayName: post.user.displayName || 'User',
    avatarUrl: post.user.avatarUrl,
    thumbnailUrl: post.mediaUrl,
    caption: post.caption || '',
    likeCount: post.likeCount,
    commentCount: post.commentCount,
  };
}

export default {
  getNearbyPlaces,
  getPlaceDetail,
  getPlaceReviews,
  createReview,
  updateReview,
  deleteReview,
  pickClosestPlace,
};

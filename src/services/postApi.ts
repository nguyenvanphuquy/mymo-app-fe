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

export interface PostPayload {
  placeId?: string;
  caption: string;
  postType: string;
  visibility: string;
  latitude?: number;
  longitude?: number;
  mediaIds: string[];
}

export interface PostResponse {
  id: string;
  placeId: string;
  caption: string;
  postType: string;
  visibility: string;
  mediaIds: string[];
  createdAt: string;
}

export async function createPost(payload: PostPayload): Promise<PostResponse> {
  const response = await requestJson<ApiResponse<PostResponse>>('/posts', 'POST', payload);
  return response.data;
}

export interface NearbyPost {
  postId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  thumbnailUrl: string | null;
  caption: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isExpired?: boolean;
}

export interface PostMedia {
  mediaId: string;
  url: string;
  thumbnailUrl?: string | null;
}

export interface FeedPost {
  postId: string;
  userId: string;
  caption?: string | null;
  visibility?: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  media: PostMedia[];
  isExpired?: boolean;
}

export interface PostView {
  postId: string;
  displayName: string;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  caption: string;
  likeCount: number;
  commentCount: number;
}

export interface PostDetailOwner {
  userId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
}

export interface PostDetailPlace {
  placeId: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
}

export interface PostDetailMedia {
  mediaId: string;
  url: string;
  thumbnailUrl: string | null;
  mediaType: string;
  width: number | null;
  height: number | null;
  duration: number | null;
}

export interface PostDetail {
  postId: string;
  caption: string | null;
  postType: string;
  visibility: string;
  createdAt: string;
  updatedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  shareCount: number;
  isLiked: boolean;
  owner: PostDetailOwner;
  place: PostDetailPlace | null;
  media: PostDetailMedia[];
}

function normalizePostDetail(raw: Record<string, unknown>): PostDetail {
  const ownerRaw = (raw.owner ?? raw.Owner ?? {}) as Record<string, unknown>;
  const placeRaw = raw.place ?? raw.Place;
  const mediaRaw = (raw.media ?? raw.Media ?? []) as Record<string, unknown>[];

  return {
    postId: String(raw.postId ?? raw.PostId ?? ''),
    caption: (raw.caption ?? raw.Caption ?? null) as string | null,
    postType: String(raw.postType ?? raw.PostType ?? 'Image'),
    visibility: String(raw.visibility ?? raw.Visibility ?? 'Public'),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? null) as string | null,
    latitude: raw.latitude != null || raw.Latitude != null
      ? Number(raw.latitude ?? raw.Latitude)
      : null,
    longitude: raw.longitude != null || raw.Longitude != null
      ? Number(raw.longitude ?? raw.Longitude)
      : null,
    likeCount: Number(raw.likeCount ?? raw.LikeCount ?? 0),
    commentCount: Number(raw.commentCount ?? raw.CommentCount ?? 0),
    viewCount: Number(raw.viewCount ?? raw.ViewCount ?? 0),
    shareCount: Number(raw.shareCount ?? raw.ShareCount ?? 0),
    isLiked: Boolean(raw.isLiked ?? raw.IsLiked ?? false),
    owner: {
      userId: String(ownerRaw.userId ?? ownerRaw.UserId ?? ''),
      displayName: (ownerRaw.displayName ?? ownerRaw.DisplayName ?? null) as string | null,
      username: String(ownerRaw.username ?? ownerRaw.Username ?? ''),
      avatarUrl: (ownerRaw.avatarUrl ?? ownerRaw.AvatarUrl ?? null) as string | null,
    },
    place: placeRaw
      ? {
          placeId: String((placeRaw as Record<string, unknown>).placeId ?? (placeRaw as Record<string, unknown>).PlaceId ?? ''),
          name: String((placeRaw as Record<string, unknown>).name ?? (placeRaw as Record<string, unknown>).Name ?? ''),
          address: ((placeRaw as Record<string, unknown>).address ?? (placeRaw as Record<string, unknown>).Address ?? null) as string | null,
          city: ((placeRaw as Record<string, unknown>).city ?? (placeRaw as Record<string, unknown>).City ?? null) as string | null,
          latitude: (placeRaw as Record<string, unknown>).latitude != null || (placeRaw as Record<string, unknown>).Latitude != null
            ? Number((placeRaw as Record<string, unknown>).latitude ?? (placeRaw as Record<string, unknown>).Latitude)
            : null,
          longitude: (placeRaw as Record<string, unknown>).longitude != null || (placeRaw as Record<string, unknown>).Longitude != null
            ? Number((placeRaw as Record<string, unknown>).longitude ?? (placeRaw as Record<string, unknown>).Longitude)
            : null,
          thumbnailUrl: ((placeRaw as Record<string, unknown>).thumbnailUrl ?? (placeRaw as Record<string, unknown>).ThumbnailUrl ?? null) as string | null,
        }
      : null,
    media: mediaRaw.map(item => ({
      mediaId: String(item.mediaId ?? item.MediaId ?? ''),
      url: String(item.url ?? item.Url ?? ''),
      thumbnailUrl: (item.thumbnailUrl ?? item.ThumbnailUrl ?? null) as string | null,
      mediaType: String(item.mediaType ?? item.MediaType ?? 'Image'),
      width: item.width != null || item.Width != null ? Number(item.width ?? item.Width) : null,
      height: item.height != null || item.Height != null ? Number(item.height ?? item.Height) : null,
      duration: item.duration != null || item.Duration != null ? Number(item.duration ?? item.Duration) : null,
    })),
  };
}

export async function getPostById(postId: string): Promise<PostDetail> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(`/posts/${postId}`, 'GET');
  return normalizePostDetail(response.data);
}

export async function likePost(postId: string): Promise<void> {
  const response = await requestJson<ApiResponse<boolean>>(`/posts/${postId}/like`, 'POST');
  if (!response.success) {
    throw new Error(response.message || 'Unable to like post');
  }
}

export async function unlikePost(postId: string): Promise<void> {
  const response = await requestJson<ApiResponse<boolean>>(`/posts/${postId}/like`, 'DELETE');
  if (!response.success) {
    throw new Error(response.message || 'Unable to unlike post');
  }
}

export function getPostThumbnail(post: FeedPost | NearbyPost): string | null {
  if ('thumbnailUrl' in post && post.thumbnailUrl) return post.thumbnailUrl;
  const media = 'media' in post ? post.media?.[0] : null;
  return media?.thumbnailUrl || media?.url || null;
}

export function toPostView(
  post: FeedPost | NearbyPost,
  displayName?: string,
  avatarUrl?: string | null,
): PostView {
  return {
    postId: post.postId,
    displayName: 'displayName' in post ? post.displayName : (displayName || 'Friend'),
    avatarUrl: 'avatarUrl' in post ? post.avatarUrl : avatarUrl,
    thumbnailUrl: getPostThumbnail(post),
    caption: post.caption || '',
    likeCount: post.likeCount,
    commentCount: post.commentCount,
  };
}

export async function getNearbyPosts(
  lat: number,
  lng: number,
  radius = 5,
  page = 1,
  pageSize = 20,
): Promise<NearbyPost[]> {
  const query = `?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}&pageSize=${pageSize}`;
  const response = await requestJson<ApiResponse<NearbyPost[]>>(`/posts/nearby${query}`, 'GET');
  return response.data ?? [];
}

export async function getFriendsFeed(): Promise<FeedPost[]> {
  const response = await requestJson<ApiResponse<FeedPost[]>>('/posts/feed/friends', 'GET');
  return response.data ?? [];
}

export async function getFeed(): Promise<FeedPost[]> {
  const response = await requestJson<ApiResponse<FeedPost[]>>('/posts/feed', 'GET');
  return response.data ?? [];
}

export async function getMyPosts(): Promise<FeedPost[]> {
  const response = await requestJson<ApiResponse<FeedPost[]>>('/posts/me', 'GET');
  return response.data ?? [];
}

export default {
  createPost,
  getPostById,
  likePost,
  unlikePost,
  getNearbyPosts,
  getFriendsFeed,
  getFeed,
  getMyPosts,
};
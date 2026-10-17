import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '../config/apiConfig';
import { rejectIfUnauthorized } from './sessionGuard';

const BASE_URL = API_URL;

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  gender: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  friendCount: number;
  postCount: number;
  placeCount: number;
  createdAt: string;
  mapMarker?: string | null;
  isPremium?: boolean;
  avatarFrame?: string | null;
  profileTheme?: string | null;
  profileTitle?: string | null;
  favoritePlaces?: FavoritePlace[];
}

export interface FavoritePlace {
  placeId: string;
  name: string;
  thumbnailUrl: string | null;
}

interface UpdateUserPayload {
  displayName?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: string;
}

interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserSettingsPayload {
  isLocationSharing?: boolean;
  isAnonymous?: boolean;
  language?: string;
  notificationEnabled?: boolean;
}

async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem('mymo.accessToken');
}

async function requestJson<T>(path: string, method: string, body?: unknown, isMultipart = false): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Accept: '*/*',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isMultipart ? (body as FormData) : body ? JSON.stringify(body) : undefined,
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
    rejectIfUnauthorized(response.status);
    const message = typeof data === 'object' && data !== null
      ? String(
          (data as { message?: unknown }).message
          || (data as { title?: unknown }).title
          || (data as { error?: unknown }).error
          || `Upload failed (${response.status})`,
        )
      : `Upload failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export interface ActivityMonth {
  year: number;
  month: number;
  posts: number;
  checkIns: number;
}

export interface ActivityInterest {
  name: string;
  count: number;
}

export interface ActivityAchievement {
  key: string;
  unlocked: boolean;
}

export interface ActivityStats {
  placesExplored: number;
  postsCreated: number;
  photoPosts: number;
  checkIns: number;
  likesReceived: number;
  commentsReceived: number;
  newFriends: number;
  streakDays: number;
  months: ActivityMonth[];
  interests: ActivityInterest[];
  achievements: ActivityAchievement[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getActivityStats(): Promise<ActivityStats> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>('/users/me/stats', 'GET');
  const raw = asRecord(response.data);
  const months = (raw.months ?? raw.Months ?? []) as unknown[];
  const interests = (raw.interests ?? raw.Interests ?? []) as unknown[];
  const achievements = (raw.achievements ?? raw.Achievements ?? []) as unknown[];

  return {
    placesExplored: asNumber(raw.placesExplored ?? raw.PlacesExplored),
    postsCreated: asNumber(raw.postsCreated ?? raw.PostsCreated),
    photoPosts: asNumber(raw.photoPosts ?? raw.PhotoPosts),
    checkIns: asNumber(raw.checkIns ?? raw.CheckIns),
    likesReceived: asNumber(raw.likesReceived ?? raw.LikesReceived),
    commentsReceived: asNumber(raw.commentsReceived ?? raw.CommentsReceived),
    newFriends: asNumber(raw.newFriends ?? raw.NewFriends),
    streakDays: asNumber(raw.streakDays ?? raw.StreakDays),
    months: months.map(item => {
      const month = asRecord(item);
      return {
        year: asNumber(month.year ?? month.Year),
        month: asNumber(month.month ?? month.Month),
        posts: asNumber(month.posts ?? month.Posts),
        checkIns: asNumber(month.checkIns ?? month.CheckIns),
      };
    }),
    interests: interests.map(item => {
      const interest = asRecord(item);
      return {
        name: String(interest.name ?? interest.Name ?? ''),
        count: asNumber(interest.count ?? interest.Count),
      };
    }),
    achievements: achievements.map(item => {
      const achievement = asRecord(item);
      return {
        key: String(achievement.key ?? achievement.Key ?? ''),
        unlocked: Boolean(achievement.unlocked ?? achievement.Unlocked),
      };
    }),
  };
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>('/users/me', 'GET');
  const raw = response.data;
  return {
    id: String(raw.id ?? raw.Id ?? raw.userId ?? raw.UserId ?? ''),
    username: String(raw.username ?? raw.Username ?? ''),
    displayName: String(raw.displayName ?? raw.DisplayName ?? ''),
    avatarUrl: (raw.avatarUrl ?? raw.AvatarUrl ?? null) as string | null,
    coverUrl: (raw.coverUrl ?? raw.CoverUrl ?? null) as string | null,
    bio: (raw.bio ?? raw.Bio ?? null) as string | null,
    gender: String(raw.gender ?? raw.Gender ?? ''),
    dateOfBirth: String(raw.dateOfBirth ?? raw.DateOfBirth ?? ''),
    email: String(raw.email ?? raw.Email ?? ''),
    phoneNumber: String(raw.phoneNumber ?? raw.PhoneNumber ?? ''),
    friendCount: Number(raw.friendCount ?? raw.FriendCount ?? 0),
    postCount: Number(raw.postCount ?? raw.PostCount ?? 0),
    placeCount: Number(raw.placeCount ?? raw.PlaceCount ?? 0),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    mapMarker: (raw.mapMarker ?? raw.MapMarker ?? null) as string | null,
    ...readProfileStyle(raw),
  };
}

function readFavoritePlaces(raw: Record<string, unknown>): FavoritePlace[] {
  const list = (raw.favoritePlaces ?? raw.FavoritePlaces ?? []) as unknown[];
  return list.map(item => {
    const place = asRecord(item);
    return {
      placeId: String(place.placeId ?? place.PlaceId ?? ''),
      name: String(place.name ?? place.Name ?? ''),
      thumbnailUrl: (place.thumbnailUrl ?? place.ThumbnailUrl ?? null) as string | null,
    };
  }).filter(place => place.placeId);
}

function readProfileStyle(raw: Record<string, unknown>) {
  return {
    isPremium: Boolean(raw.isPremium ?? raw.IsPremium),
    avatarFrame: (raw.avatarFrame ?? raw.AvatarFrame ?? null) as string | null,
    profileTheme: (raw.profileTheme ?? raw.ProfileTheme ?? null) as string | null,
    profileTitle: (raw.profileTitle ?? raw.ProfileTitle ?? null) as string | null,
    favoritePlaces: readFavoritePlaces(raw),
  };
}

export type PublicUserProfile = Omit<UserProfile, 'email' | 'phoneNumber'>;

function normalizePublicProfile(raw: Record<string, unknown>): PublicUserProfile {
  return {
    id: String(raw.id ?? raw.Id ?? raw.userId ?? raw.UserId ?? ''),
    username: String(raw.username ?? raw.Username ?? ''),
    displayName: String(raw.displayName ?? raw.DisplayName ?? ''),
    avatarUrl: (raw.avatarUrl ?? raw.AvatarUrl ?? null) as string | null,
    coverUrl: (raw.coverUrl ?? raw.CoverUrl ?? null) as string | null,
    bio: (raw.bio ?? raw.Bio ?? null) as string | null,
    gender: String(raw.gender ?? raw.Gender ?? ''),
    dateOfBirth: String(raw.dateOfBirth ?? raw.DateOfBirth ?? ''),
    friendCount: Number(raw.friendCount ?? raw.FriendCount ?? 0),
    postCount: Number(raw.postCount ?? raw.PostCount ?? 0),
    placeCount: Number(raw.placeCount ?? raw.PlaceCount ?? 0),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    ...readProfileStyle(raw),
  };
}

export async function setProfileStyle(payload: {
  avatarFrame?: string | null;
  profileTheme?: string | null;
  profileTitle?: string | null;
}): Promise<void> {
  const response = await requestJson<ApiResponse<unknown>>('/users/me/style', 'PUT', payload);
  if (!response.success) throw new Error(response.message || 'Unable to update profile style');
}

export async function setFavoritePlaces(placeIds: string[]): Promise<void> {
  const response = await requestJson<ApiResponse<unknown>>('/users/me/favorite-places', 'PUT', { placeIds });
  if (!response.success) throw new Error(response.message || 'Unable to update favorite places');
}

export async function getVisitedPlaces(): Promise<FavoritePlace[]> {
  const response = await requestJson<ApiResponse<unknown[]>>('/users/me/visited-places', 'GET');
  return readFavoritePlaces({ favoritePlaces: response.data ?? [] });
}

export async function getUserPublicProfile(userId: string): Promise<PublicUserProfile> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(`/users/${userId}`, 'GET');
  if (!response.success) {
    throw new Error(response.message || 'Unable to load profile');
  }
  return normalizePublicProfile(response.data);
}

export async function updateUserProfile(payload: UpdateUserPayload): Promise<UserProfile> {
  const response = await requestJson<ApiResponse<UserProfile>>('/users/me', 'PUT', payload);
  return response.data;
}

export async function changeUserPassword(payload: ChangePasswordPayload): Promise<void> {
  await requestJson<ApiResponse<null>>('/users/change-password', 'PUT', payload);
}

export async function updateUserSettings(payload: UserSettingsPayload): Promise<void> {
  const response = await requestJson<ApiResponse<boolean>>('/users/settings', 'PATCH', payload);
  if (!response.success) {
    throw new Error(response.message || 'Unable to update settings');
  }
}

export async function hideUserLocation(): Promise<void> {
  await updateUserLocation(null, null);
}

export async function getNearbyOnlinePoints(
  lat: number,
  lng: number,
  radius = 25,
): Promise<Array<{ userId: string; latitude: number; longitude: number }>> {
  const query = `?lat=${lat}&lng=${lng}&radius=${radius}`;
  const response = await requestJson<ApiResponse<unknown[]>>(`/users/nearby/online${query}`, 'GET');
  return (response.data ?? [])
    .map(item => {
      const raw = item as Record<string, unknown>;
      const latitude = Number(raw.latitude ?? raw.Latitude);
      const longitude = Number(raw.longitude ?? raw.Longitude);
      const userId = String(raw.userId ?? raw.UserId ?? '');
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { userId, latitude, longitude };
    })
    .filter((point): point is { userId: string; latitude: number; longitude: number } => point != null);
}

export async function updateUserLocation(
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  const response = await requestJson<ApiResponse<boolean>>('/users/location', 'PUT', {
    latitude,
    longitude,
  });
  if (!response.success) {
    throw new Error(response.message || 'Unable to update location');
  }
}

export async function uploadUserAvatar(file: FormData): Promise<string> {
  const response = await requestJson<ApiResponse<string | { url?: string; avatarUrl?: string }>>(
    '/users/avatar',
    'PUT',
    file,
    true,
  );
  if (!response.success) {
    throw new Error(response.message || 'Failed to upload avatar');
  }
  const data = response.data;
  if (typeof data === 'string') return data;
  return data?.url || data?.avatarUrl || '';
}

export async function uploadUserCover(file: FormData): Promise<string> {
  const response = await requestJson<ApiResponse<string | { url?: string; coverUrl?: string }>>(
    '/users/cover',
    'PUT',
    file,
    true,
  );
  if (!response.success) {
    throw new Error(response.message || 'Failed to upload cover');
  }
  const data = response.data;
  if (typeof data === 'string') return data;
  return data?.url || data?.coverUrl || '';
}

export async function setMapMarker(marker: string | null): Promise<string | null> {
  const response = await requestJson<ApiResponse<string | null>>('/users/map-marker', 'PUT', { marker });
  if (!response.success) {
    throw new Error(response.message || 'Unable to update map character');
  }
  return response.data ?? null;
}

export async function uploadMapMarkerImage(file: FormData): Promise<string> {
  const response = await requestJson<ApiResponse<string>>('/users/map-marker/image', 'PUT', file, true);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Unable to upload map avatar');
  }
  return response.data;
}

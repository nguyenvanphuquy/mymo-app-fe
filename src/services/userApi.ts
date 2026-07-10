import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://beexe-production.up.railway.app/api';

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
  };
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

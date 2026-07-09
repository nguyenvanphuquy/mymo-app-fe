import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeFriendLocations, type FriendLocation } from '../utils/mapFriendUtils';

const BASE_URL = 'https://beexe-production.up.railway.app/api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

export interface FriendSummary {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  requestedAt?: string;
  mutualFriendsCount?: number;
  isOnline?: boolean;
}

export interface PendingFriendRequest {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  requestedAt: string;
}

export interface SentFriendRequest {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  requestedAt: string;
}

export interface BlockedUser {
  userId: string;
  username: string;
  displayName: string;
}

export interface FriendStatusResponse {
  userId: string;
  status: string;
}

function normalizeFriend(raw: Record<string, unknown>): FriendSummary {
  return {
    userId: String(raw.userId || raw.UserId || ''),
    username: String(raw.username || raw.Username || ''),
    displayName: String(raw.displayName || raw.DisplayName || raw.username || raw.Username || 'Friend'),
    avatarUrl: (raw.avatarUrl ?? raw.AvatarUrl ?? null) as string | null,
    requestedAt: raw.requestedAt ? String(raw.requestedAt) : undefined,
    mutualFriendsCount: raw.mutualFriendsCount != null ? Number(raw.mutualFriendsCount) : undefined,
    isOnline: Boolean(raw.isOnline ?? raw.IsOnline ?? false),
  };
}

function normalizePendingRequest(raw: Record<string, unknown>): PendingFriendRequest {
  return {
    userId: String(raw.requesterId || raw.RequesterId || raw.userId || raw.id),
    username: String(raw.requesterUsername || raw.RequesterUsername || raw.username || ''),
    displayName: String(raw.requesterDisplayName || raw.RequesterDisplayName || raw.displayName || raw.requesterUsername || 'Friend'),
    avatarUrl: (raw.requesterAvatarUrl ?? raw.RequesterAvatarUrl ?? raw.avatarUrl ?? null) as string | null,
    requestedAt: String(raw.requestedAt || raw.RequestedAt || raw.createdAt || new Date().toISOString()),
  };
}

function normalizeSentRequest(raw: Record<string, unknown>): SentFriendRequest {
  return {
    userId: String(raw.receiverId || raw.ReceiverId || raw.userId || ''),
    username: String(raw.receiverUsername || raw.ReceiverUsername || raw.username || ''),
    displayName: String(raw.receiverDisplayName || raw.ReceiverDisplayName || raw.displayName || raw.receiverUsername || 'Friend'),
    avatarUrl: (raw.receiverAvatarUrl ?? raw.ReceiverAvatarUrl ?? raw.avatarUrl ?? null) as string | null,
    requestedAt: String(raw.requestedAt || raw.RequestedAt || raw.createdAt || new Date().toISOString()),
  };
}

function normalizeBlockedUser(raw: Record<string, unknown>): BlockedUser {
  return {
    userId: String(raw.userId || raw.UserId || ''),
    username: String(raw.username || raw.Username || ''),
    displayName: String(raw.displayName || raw.DisplayName || raw.username || 'User'),
  };
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
    body: body && !isMultipart ? JSON.stringify(body) : (body as FormData | undefined),
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

export async function requestFriend(userId: string): Promise<boolean> {
  const response = await requestJson<ApiResponse<boolean>>('/friends/request', 'POST', { userId });
  return response.data;
}

export async function acceptFriend(friendId: string): Promise<boolean> {
  const response = await requestJson<ApiResponse<boolean>>(`/friends/${friendId}/accept`, 'PUT');
  return response.data;
}

export async function rejectFriend(friendId: string): Promise<boolean> {
  const response = await requestJson<ApiResponse<boolean>>(`/friends/${friendId}/reject`, 'PUT');
  return response.data;
}

export async function cancelFriendRequest(friendId: string): Promise<boolean> {
  const response = await requestJson<ApiResponse<boolean>>(`/friends/request/${friendId}`, 'DELETE');
  return response.data;
}

export async function removeFriend(friendId: string): Promise<boolean> {
  const response = await requestJson<ApiResponse<boolean>>(`/friends/${friendId}`, 'DELETE');
  return response.data;
}

export async function getFriends(): Promise<FriendSummary[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>('/friends', 'GET');
  return (response.data || []).map(normalizeFriend);
}

export async function getFriendRequests(): Promise<PendingFriendRequest[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>('/friends/requests', 'GET');
  return (response.data || []).map(normalizePendingRequest);
}

export async function getSentRequests(): Promise<SentFriendRequest[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>('/friends/sent', 'GET');
  return (response.data || []).map(normalizeSentRequest);
}

export async function getFriendStatus(userId: string): Promise<FriendStatusResponse> {
  const response = await requestJson<ApiResponse<FriendStatusResponse>>(`/friends/status/${userId}`, 'GET');
  return response.data;
}

export async function getFriendSuggestions(): Promise<FriendSummary[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>('/friends/suggestions', 'GET');
  return (response.data || []).map(normalizeFriend);
}

export async function getMutualFriends(userId: string): Promise<FriendSummary[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>(`/friends/mutual/${userId}`, 'GET');
  return (response.data || []).map(normalizeFriend);
}

export async function getFriendCount(): Promise<number> {
  const response = await requestJson<ApiResponse<number>>('/friends/count', 'GET');
  return response.data;
}

export async function getOnlineFriends(): Promise<FriendSummary[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>('/friends/online', 'GET');
  return (response.data || []).map(normalizeFriend);
}

export async function getFriendsLocations(): Promise<FriendLocation[]> {
  try {
    const response = await requestJson<ApiResponse<Record<string, unknown>[]>>('/friends/locations', 'GET');
    return normalizeFriendLocations(response.data || []);
  } catch {
    return [];
  }
}

export async function searchFriends(keyword: string): Promise<FriendSummary[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>(`/friends/search?keyword=${encodeURIComponent(keyword)}`, 'GET');
  return (response.data || []).map(normalizeFriend);
}

export async function blockFriend(userId: string): Promise<boolean> {
  const response = await requestJson<ApiResponse<boolean>>('/friends/block', 'POST', { userId });
  return response.data;
}

export async function unblockFriend(userId: string): Promise<boolean> {
  const response = await requestJson<ApiResponse<boolean>>(`/friends/block/${userId}`, 'DELETE');
  return response.data;
}

export async function getBlockedFriends(): Promise<BlockedUser[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>('/friends/block', 'GET');
  return (response.data || []).map(normalizeBlockedUser);
}

export default {
  requestFriend,
  acceptFriend,
  rejectFriend,
  cancelFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
  getSentRequests,
  getFriendStatus,
  getFriendSuggestions,
  getMutualFriends,
  getFriendCount,
  getOnlineFriends,
  getFriendsLocations,
  searchFriends,
  blockFriend,
  unblockFriend,
  getBlockedFriends,
};

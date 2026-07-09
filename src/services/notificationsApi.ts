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

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = text;
  if (text) {
    try { data = JSON.parse(text); } catch {}
  }

  if (!res.ok) {
    const msg = typeof data === 'object' && data && 'message' in data ? String((data as any).message) : 'Request failed';
    throw new Error(msg);
  }

  return data as T;
}

export type NotificationUiType =
  | 'request'
  | 'friend_accepted'
  | 'friend_rejected'
  | 'like'
  | 'comment'
  | 'chat'
  | 'info';

export interface NotificationSender {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationUiType;
  title?: string;
  body?: string;
  createdAt?: string;
  isRead?: boolean;
  senderId?: string;
  senderName?: string;
  avatarUrl?: string | null;
  referenceId?: string | null;
  postId?: string | null;
  conversationId?: string | null;
  groupIds?: string[];
  senders?: NotificationSender[];
  isGrouped?: boolean;
  count?: number;
}

interface RawNotificationSender {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface RawNotificationItem {
  notificationId: string;
  senderId?: string;
  type: string;
  title?: string;
  content?: string;
  referenceId?: string | null;
  isRead?: boolean;
  createdAt?: string;
  sender?: RawNotificationSender | null;
}

function mapNotificationType(rawType: string, title?: string, content?: string): NotificationUiType {
  const type = rawType.toLowerCase();
  const text = `${title || ''} ${content || ''}`.toLowerCase();

  if (type === 'friendaccepted' || type.includes('friend_accepted')) return 'friend_accepted';
  if (type === 'postliked' || type === 'like' || type.includes('postliked')) return 'like';
  if (type === 'postcommented' || type === 'comment' || type.includes('postcommented')) return 'comment';
  if (type === 'chatmessage' || type.includes('chatmessage') || type.includes('chat_message')) return 'chat';

  if (type.includes('friendrequest') || type.includes('friend_request')) {
    if (text.includes('accepted') || text.includes('đồng ý')) return 'friend_accepted';
    if (text.includes('rejected') || text.includes('declined') || text.includes('từ chối')) return 'friend_rejected';
    if (/sent you|has sent|friend request|lời mời/.test(text)) return 'request';
    return 'info';
  }

  if (type.includes('like')) return 'like';
  if (type.includes('comment')) return 'comment';
  return 'info';
}

function extractSenderName(
  sender?: RawNotificationSender | null,
  senderId?: string,
  title?: string,
  content?: string,
): string | null {
  if (sender?.displayName) return sender.displayName;

  const text = content || title || '';
  const match = text.match(/^(.+?)\s+(sent you|accepted your|declined your|liked your|commented on)/i);
  return match?.[1]?.trim() || null;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const res = await requestJson<ApiResponse<RawNotificationItem[]>>('/notifications', 'GET');
  return (res.data || []).map(item => {
    const mappedType = mapNotificationType(item.type, item.title, item.content);
    const senderId = item.sender?.userId || item.senderId;
    const senderName = extractSenderName(item.sender, senderId, item.title, item.content);
    const isPostRelated = mappedType === 'like' || mappedType === 'comment';
    const isChat = mappedType === 'chat';

    return {
      id: item.notificationId,
      type: mappedType,
      title: senderName || item.title,
      body: item.content || item.title,
      createdAt: item.createdAt,
      isRead: item.isRead,
      senderId,
      senderName: senderName || undefined,
      avatarUrl: item.sender?.avatarUrl ?? null,
      referenceId: item.referenceId,
      postId: isPostRelated ? (item.referenceId || null) : null,
      conversationId: isChat ? (item.referenceId || null) : null,
    };
  });
}

export async function getUnreadCount(): Promise<number> {
  const res = await requestJson<ApiResponse<number>>('/notifications/unread-count', 'GET');
  return res.data || 0;
}

export async function markAsRead(id: string): Promise<boolean> {
  const res = await requestJson<ApiResponse<boolean>>(`/notifications/${id}/read`, 'PATCH');
  return res.data;
}

export async function markAllRead(): Promise<boolean> {
  try {
    const res = await requestJson<ApiResponse<boolean>>('/notifications/read-all', 'PATCH');
    return res.data;
  } catch {
    const res = await requestJson<ApiResponse<boolean>>('/notifications/read-all', 'PUT');
    return res.data;
  }
}

export async function clearAllNotifications(): Promise<boolean> {
  try {
    const res = await requestJson<ApiResponse<boolean>>('/notifications/clear-all', 'DELETE');
    return res.data;
  } catch {
    const items = await getNotifications();
    await Promise.all(items.map(item => deleteNotification(item.id).catch(() => false)));
    return true;
  }
}

export async function deleteNotification(id: string): Promise<boolean> {
  const res = await requestJson<ApiResponse<boolean>>(`/notifications/${id}`, 'DELETE');
  return res.data;
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  clearAllNotifications,
  deleteNotification,
};

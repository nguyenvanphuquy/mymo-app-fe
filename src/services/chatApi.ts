import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://beexe-production.up.railway.app/api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

export type MessageTypeName = 'Text' | 'Image' | 'Video' | 'File' | 'System' | 'Location' | 'Post' | 'Place';

export enum MessageType {
  Text = 0,
  Image = 1,
  Video = 2,
  File = 3,
  System = 4,
  Location = 5,
  Post = 6,
  Place = 7,
}

export interface ConversationSummary {
  conversationId: string;
  conversationName: string;
  conversationAvatar?: string | null;
  conversationType: 'Private' | 'Group' | string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount: number;
}

export interface ChatSender {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  sender: ChatSender;
  messageType: MessageType;
  content: string;
  mediaUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  referenceId?: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface PagedMessages {
  items: ChatMessage[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface SendMessagePayload {
  messageType: MessageType;
  content?: string;
  mediaId?: string;
  latitude?: number;
  longitude?: number;
  referenceId?: string;
}

function parseMessageType(raw: unknown): MessageType {
  if (typeof raw === 'number') return raw as MessageType;
  if (typeof raw === 'string') {
    const key = raw as MessageTypeName;
    if (key in MessageType) return MessageType[key as keyof typeof MessageType];
  }
  return MessageType.Text;
}

function normalizeSender(raw: Record<string, unknown>): ChatSender {
  return {
    userId: String(raw.userId || raw.UserId || ''),
    displayName: String(raw.displayName || raw.DisplayName || 'User'),
    avatarUrl: (raw.avatarUrl ?? raw.AvatarUrl ?? null) as string | null,
  };
}

function normalizeMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    messageId: String(raw.messageId || raw.MessageId || ''),
    conversationId: String(raw.conversationId || raw.ConversationId || ''),
    sender: normalizeSender((raw.sender || raw.Sender || {}) as Record<string, unknown>),
    messageType: parseMessageType(raw.messageType ?? raw.MessageType),
    content: String(raw.content || raw.Content || ''),
    mediaUrl: (raw.mediaUrl ?? raw.MediaUrl ?? null) as string | null,
    latitude: raw.latitude != null ? Number(raw.latitude) : raw.Latitude != null ? Number(raw.Latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : raw.Longitude != null ? Number(raw.Longitude) : null,
    referenceId: raw.referenceId ? String(raw.referenceId) : raw.ReferenceId ? String(raw.ReferenceId) : null,
    createdAt: String(raw.createdAt || raw.CreatedAt || new Date().toISOString()),
    isRead: Boolean(raw.isRead ?? raw.IsRead ?? false),
  };
}

function normalizeConversation(raw: Record<string, unknown>): ConversationSummary {
  return {
    conversationId: String(raw.conversationId || raw.ConversationId || ''),
    conversationName: String(raw.conversationName || raw.ConversationName || 'Chat'),
    conversationAvatar: (raw.conversationAvatar ?? raw.ConversationAvatar ?? null) as string | null,
    conversationType: String(raw.conversationType || raw.ConversationType || 'Private'),
    lastMessage: (raw.lastMessage ?? raw.LastMessage ?? null) as string | null,
    lastMessageTime: raw.lastMessageTime ? String(raw.lastMessageTime) : raw.LastMessageTime ? String(raw.LastMessageTime) : null,
    unreadCount: Number(raw.unreadCount ?? raw.UnreadCount ?? 0),
  };
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
    const msg = typeof data === 'object' && data && 'message' in data
      ? String((data as { message?: unknown }).message)
      : 'Request failed';
    throw new Error(msg);
  }

  return data as T;
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const res = await requestJson<ApiResponse<Record<string, unknown>[]>>('/conversations', 'GET');
  return (res.data || []).map(normalizeConversation);
}

export async function createPrivateConversation(userId: string): Promise<ConversationSummary> {
  const res = await requestJson<ApiResponse<Record<string, unknown>>>('/conversations/private', 'POST', { userId });
  return normalizeConversation(res.data);
}

export async function getMessages(
  conversationId: string,
  page = 1,
  pageSize = 50,
): Promise<PagedMessages> {
  const res = await requestJson<ApiResponse<Record<string, unknown>>>(
    `/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`,
    'GET',
  );
  const raw = res.data || {};
  const items = ((raw.items || raw.Items || []) as Record<string, unknown>[]).map(normalizeMessage);
  return {
    items,
    page: Number(raw.page ?? raw.Page ?? page),
    pageSize: Number(raw.pageSize ?? raw.PageSize ?? pageSize),
    totalCount: Number(raw.totalCount ?? raw.TotalCount ?? items.length),
  };
}

export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload,
): Promise<ChatMessage> {
  const res = await requestJson<ApiResponse<Record<string, unknown>>>(
    `/conversations/${conversationId}/messages`,
    'POST',
    payload,
  );
  return normalizeMessage(res.data);
}

export async function markConversationRead(conversationId: string): Promise<boolean> {
  const res = await requestJson<ApiResponse<boolean>>(`/conversations/${conversationId}/read-all`, 'PATCH');
  return res.data;
}

export async function markMessageRead(messageId: string): Promise<boolean> {
  const res = await requestJson<ApiResponse<boolean>>(`/messages/${messageId}/read`, 'PATCH');
  return res.data;
}

export default {
  getConversations,
  createPrivateConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  markMessageRead,
  MessageType,
};

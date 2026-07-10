import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from './chatApi';
import { MessageType } from './chatApi';

const HUB_URL = 'https://beexe-production.up.railway.app/hubs/chat';

type MessageHandler = (message: ChatMessage) => void;
type MessageDeletedHandler = (payload: { messageId: string }) => void;
type TypingHandler = (payload: { userId: string; displayName: string }) => void;
type StopTypingHandler = (payload: { userId: string }) => void;

let connection: signalR.HubConnection | null = null;
let starting: Promise<signalR.HubConnection> | null = null;

const messageHandlers = new Set<MessageHandler>();
const messageDeletedHandlers = new Set<MessageDeletedHandler>();
const typingHandlers = new Set<TypingHandler>();
const stopTypingHandlers = new Set<StopTypingHandler>();

function parseHubMessage(raw: Record<string, unknown>): ChatMessage {
  const sender = (raw.sender || raw.Sender || {}) as Record<string, unknown>;
  const messageTypeRaw = raw.messageType ?? raw.MessageType ?? 0;
  let messageType = MessageType.Text;
  if (typeof messageTypeRaw === 'number') {
    messageType = messageTypeRaw as MessageType;
  } else if (typeof messageTypeRaw === 'string') {
    messageType = MessageType[messageTypeRaw as keyof typeof MessageType] ?? MessageType.Text;
  }

  const content = String(raw.content || raw.Content || '');
  const isDeleted = Boolean(
    raw.isDeleted ?? raw.IsDeleted ?? content === 'This message has been deleted.',
  );

  return {
    messageId: String(raw.messageId || raw.MessageId || ''),
    conversationId: String(raw.conversationId || raw.ConversationId || ''),
    sender: {
      userId: String(sender.userId || sender.UserId || ''),
      displayName: String(sender.displayName || sender.DisplayName || 'User'),
      avatarUrl: (sender.avatarUrl ?? sender.AvatarUrl ?? null) as string | null,
    },
    messageType,
    content,
    mediaUrl: (raw.mediaUrl ?? raw.MediaUrl ?? null) as string | null,
    latitude: raw.latitude != null ? Number(raw.latitude) : raw.Latitude != null ? Number(raw.Latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : raw.Longitude != null ? Number(raw.Longitude) : null,
    referenceId: raw.referenceId ? String(raw.referenceId) : raw.ReferenceId ? String(raw.ReferenceId) : null,
    createdAt: String(raw.createdAt || raw.CreatedAt || new Date().toISOString()),
    isRead: Boolean(raw.isRead ?? raw.IsRead ?? false),
    isDeleted,
  };
}

function wireConnection(conn: signalR.HubConnection) {
  conn.off('ReceiveMessage');
  conn.off('MessageDeleted');
  conn.off('UserTyping');
  conn.off('UserStopTyping');

  conn.on('ReceiveMessage', (raw: Record<string, unknown>) => {
    const message = parseHubMessage(raw);
    messageHandlers.forEach(handler => handler(message));
  });

  conn.on('MessageDeleted', (raw: { messageId?: string; MessageId?: string }) => {
    const messageId = String(raw.messageId || raw.MessageId || '');
    if (!messageId) return;
    messageDeletedHandlers.forEach(handler => handler({ messageId }));
  });

  conn.on('UserTyping', (raw: { userId?: string; UserId?: string; displayName?: string; DisplayName?: string }) => {
    typingHandlers.forEach(handler => handler({
      userId: String(raw.userId || raw.UserId || ''),
      displayName: String(raw.displayName || raw.DisplayName || 'User'),
    }));
  });

  conn.on('UserStopTyping', (raw: { userId?: string; UserId?: string }) => {
    stopTypingHandlers.forEach(handler => handler({
      userId: String(raw.userId || raw.UserId || ''),
    }));
  });
}

export async function ensureChatHubConnected(): Promise<signalR.HubConnection> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  if (starting) return starting;

  starting = (async () => {
    const token = await AsyncStorage.getItem('mymo.accessToken');
    if (!token) throw new Error('Not authenticated');

    if (connection) {
      try { await connection.stop(); } catch { /* ignore */ }
    }

    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_URL}?access_token=${encodeURIComponent(token)}`, {
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        skipNegotiation: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    wireConnection(connection);
    await connection.start();
    return connection;
  })();

  try {
    return await starting;
  } finally {
    starting = null;
  }
}

export async function joinConversation(conversationId: string): Promise<void> {
  const conn = await ensureChatHubConnected();
  await conn.invoke('JoinConversation', conversationId);
}

export async function leaveConversation(conversationId: string): Promise<void> {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('LeaveConversation', conversationId);
  } catch { /* ignore */ }
}

export async function disconnectChatHub(): Promise<void> {
  if (!connection) return;
  try { await connection.stop(); } catch { /* ignore */ }
  connection = null;
}

export function onReceiveMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

export function onMessageDeleted(handler: MessageDeletedHandler): () => void {
  messageDeletedHandlers.add(handler);
  return () => messageDeletedHandlers.delete(handler);
}

export function onUserTyping(handler: TypingHandler): () => void {
  typingHandlers.add(handler);
  return () => typingHandlers.delete(handler);
}

export function onUserStopTyping(handler: StopTypingHandler): () => void {
  stopTypingHandlers.add(handler);
  return () => stopTypingHandlers.delete(handler);
}

export default {
  ensureChatHubConnected,
  joinConversation,
  leaveConversation,
  disconnectChatHub,
  onReceiveMessage,
  onMessageDeleted,
  onUserTyping,
  onUserStopTyping,
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type MymyRole = 'user' | 'model';

export interface MymyTurn {
  role: MymyRole;
  text: string;
}

interface ApiResponse<T> {
  success?: boolean;
  Success?: boolean;
  message?: string;
  Message?: string;
  data?: T;
  Data?: T;
}

interface ChatData {
  reply?: string;
  Reply?: string;
}

export async function chatWithMymy(message: string, history: MymyTurn[]): Promise<string> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/mymy/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history }),
  });

  const raw = await res.text();
  let data: ApiResponse<ChatData> = {};
  if (raw) {
    try {
      data = JSON.parse(raw) as ApiResponse<ChatData>;
    } catch {
      data = { message: raw };
    }
  }

  const success = data.success ?? data.Success ?? false;
  const payload = data.data ?? data.Data;
  const reply = payload?.reply ?? payload?.Reply ?? '';

  if (!res.ok || !success || !reply.trim()) {
    if (res.status === 401) {
      throw new Error('Đăng nhập để nói chuyện với Trợ lý MyMy nhé.');
    }
    const msg = data.message ?? data.Message;
    throw new Error(msg || 'Trợ lý MyMy chưa trả lời được. Thử lại nhé.');
  }

  return reply.trim();
}

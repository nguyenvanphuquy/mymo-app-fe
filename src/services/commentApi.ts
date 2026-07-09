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

export interface CommentUser {
  userId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
}

export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string | null;
  user: CommentUser;
  replies: Comment[];
}

function normalizeUser(raw: Record<string, unknown>): CommentUser {
  return {
    userId: String(raw.userId ?? raw.UserId ?? ''),
    displayName: (raw.displayName ?? raw.DisplayName ?? null) as string | null,
    username: String(raw.username ?? raw.Username ?? ''),
    avatarUrl: (raw.avatarUrl ?? raw.AvatarUrl ?? null) as string | null,
  };
}

function normalizeComment(raw: Record<string, unknown>): Comment {
  const userRaw = (raw.user ?? raw.User ?? {}) as Record<string, unknown>;
  const repliesRaw = (raw.replies ?? raw.Replies ?? []) as Record<string, unknown>[];

  return {
    commentId: String(raw.commentId ?? raw.CommentId ?? ''),
    postId: String(raw.postId ?? raw.PostId ?? ''),
    userId: String(raw.userId ?? raw.UserId ?? ''),
    parentCommentId: (raw.parentCommentId ?? raw.ParentCommentId ?? null) as string | null,
    content: String(raw.content ?? raw.Content ?? ''),
    likeCount: Number(raw.likeCount ?? raw.LikeCount ?? 0),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? null) as string | null,
    user: normalizeUser(userRaw),
    replies: repliesRaw.map(item => normalizeComment(item as Record<string, unknown>)),
  };
}

export async function getPostComments(postId: string): Promise<Comment[]> {
  const response = await requestJson<ApiResponse<Record<string, unknown>[]>>(
    `/posts/${postId}/comments`,
    'GET',
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to load comments');
  }
  return (response.data ?? []).map(item => normalizeComment(item));
}

export async function createComment(postId: string, content: string): Promise<Comment> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(
    `/posts/${postId}/comments`,
    'POST',
    { content },
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to post comment');
  }
  return normalizeComment(response.data);
}

export async function replyComment(commentId: string, content: string): Promise<Comment> {
  const response = await requestJson<ApiResponse<Record<string, unknown>>>(
    `/comments/${commentId}/reply`,
    'POST',
    { content },
  );
  if (!response.success) {
    throw new Error(response.message || 'Unable to post reply');
  }
  return normalizeComment(response.data);
}

export async function deleteComment(commentId: string): Promise<void> {
  await requestJson<void>(`/comments/${commentId}`, 'DELETE');
}

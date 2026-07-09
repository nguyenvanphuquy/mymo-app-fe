import type { FeedPost } from '../services/postApi';
import { getPostThumbnail } from '../services/postApi';

export interface UserMomentGroup {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  posts: FeedPost[];
  latestPost: FeedPost;
  count: number;
}

export function groupPostsByUser(
  posts: FeedPost[],
  friendNames: Record<string, { name: string; avatar?: string | null }>,
): UserMomentGroup[] {
  const map = new Map<string, FeedPost[]>();

  for (const post of posts) {
    const bucket = map.get(post.userId) ?? [];
    bucket.push(post);
    map.set(post.userId, bucket);
  }

  return Array.from(map.entries())
    .map(([userId, userPosts]) => {
      const sorted = [...userPosts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const friend = friendNames[userId];

      return {
        userId,
        displayName: friend?.name || 'Friend',
        avatarUrl: friend?.avatar ?? null,
        posts: sorted,
        latestPost: sorted[0],
        count: sorted.length,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latestPost.createdAt).getTime() - new Date(a.latestPost.createdAt).getTime(),
    );
}

export function getGroupThumbnail(group: UserMomentGroup): string | null {
  return getPostThumbnail(group.latestPost);
}

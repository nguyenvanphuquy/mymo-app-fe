import type { NearbyPost } from '../services/postApi';

export function upsertMapNearbyPost(posts: NearbyPost[], incoming: NearbyPost): NearbyPost[] {
  const index = posts.findIndex(post => post.postId === incoming.postId);
  if (index < 0) return [...posts, incoming];

  const next = [...posts];
  next[index] = incoming;
  return next;
}

export function removeMapNearbyPost(posts: NearbyPost[], postId: string): NearbyPost[] {
  return posts.filter(post => post.postId !== postId);
}

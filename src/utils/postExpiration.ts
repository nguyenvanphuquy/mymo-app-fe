const POST_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function isPostActive(createdAt: string, isExpired?: boolean): boolean {
  if (typeof isExpired === 'boolean') return !isExpired;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  return Date.now() - created < POST_LIFETIME_MS;
}

export function filterActivePosts<T extends { createdAt: string; isExpired?: boolean }>(posts: T[]): T[] {
  return posts.filter(post => isPostActive(post.createdAt, post.isExpired));
}

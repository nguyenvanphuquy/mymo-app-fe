const POST_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function isPostActive(createdAt: string, isExpired?: boolean): boolean {
  const created = new Date(createdAt).getTime();
  if (!Number.isNaN(created)) {
    return Date.now() - created < POST_LIFETIME_MS;
  }
  if (typeof isExpired === 'boolean') return !isExpired;
  return true;
}

export function filterActivePosts<T extends { createdAt: string; isExpired?: boolean }>(posts: T[]): T[] {
  return posts.filter(post => isPostActive(post.createdAt, post.isExpired));
}

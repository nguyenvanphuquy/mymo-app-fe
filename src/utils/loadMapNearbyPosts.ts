import { getStoredAuthSession } from '../services/authApi';
import {
  feedPostToNearbyPost,
  getMyPosts,
  getNearbyPosts,
  type NearbyPost,
} from '../services/postApi';
import { filterActivePosts } from './postExpiration';

function mergeOwnPosts(
  nearby: NearbyPost[],
  myPosts: Awaited<ReturnType<typeof getMyPosts>>,
  myUserId: string | null,
  myDisplayName: string,
  myAvatarUrl: string | null,
): NearbyPost[] {
  if (!myUserId) return nearby;

  const merged = [...nearby];
  const seen = new Set(merged.map(post => post.postId));
  const ownId = myUserId.toLowerCase();

  for (const post of filterActivePosts(myPosts)) {
    if (post.userId.toLowerCase() !== ownId || seen.has(post.postId)) continue;

    const mapPost = feedPostToNearbyPost(post, myDisplayName, myAvatarUrl);
    if (!mapPost) continue;

    merged.push(mapPost);
    seen.add(mapPost.postId);
  }

  return merged;
}

/** Load all active posts for the map, including own posts missing from the nearby API. */
export async function loadMapNearbyPosts(
  lat: number,
  lng: number,
): Promise<NearbyPost[]> {
  const session = await getStoredAuthSession().catch(() => null);
  const myUserId = session?.userId ?? null;
  const myDisplayName = session?.displayName || session?.username || 'You';
  const myAvatarUrl = session?.avatarUrl ?? null;

  const [nearby, myPosts] = await Promise.all([
    getNearbyPosts(lat, lng, 10, 1, 100),
    getMyPosts().catch(() => []),
  ]);

  return mergeOwnPosts(
    filterActivePosts(nearby),
    myPosts,
    myUserId,
    myDisplayName,
    myAvatarUrl,
  );
}

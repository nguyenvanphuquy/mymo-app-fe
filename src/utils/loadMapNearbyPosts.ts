import { getStoredAuthSession } from '../services/authApi';
import { getUserProfile } from '../services/userApi';
import {
  feedPostToNearbyPost,
  getMyPosts,
  getNearbyPosts,
  hasPostCoordinates,
  type FeedPost,
  type NearbyPost,
} from '../services/postApi';

function mergeOwnPosts(
  nearby: NearbyPost[],
  myPosts: FeedPost[],
  myDisplayName: string,
  myAvatarUrl: string | null,
): NearbyPost[] {
  const merged = [...nearby];
  const seen = new Set(merged.map(post => post.postId));

  for (const post of myPosts) {
    if (seen.has(post.postId) || !hasPostCoordinates(post)) continue;

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

  let myDisplayName = session?.username || 'You';
  let myAvatarUrl: string | null = null;

  try {
    const profile = await getUserProfile();
    myDisplayName = profile.displayName || profile.username || myDisplayName;
    myAvatarUrl = profile.avatarUrl;
  } catch {
    // profile optional for display name only
  }

  const [nearby, myPosts] = await Promise.all([
    getNearbyPosts(lat, lng, 25, 1, 100),
    getMyPosts().catch(() => [] as FeedPost[]),
  ]);

  return mergeOwnPosts(
    nearby,
    myPosts,
    myDisplayName,
    myAvatarUrl,
  );
}

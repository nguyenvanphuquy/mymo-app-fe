/** ~5 m — posts closer than this are treated as the same map point */
const PROXIMITY_THRESHOLD = 0.00005;

/** ~10 m offset per ring so stacked markers fan out visibly */
const OFFSET_RADIUS_DEG = 0.00009;

export interface MapPositionedPost<T> {
  post: T;
  latitude: number;
  longitude: number;
}

interface HasCoords {
  postId: string;
  latitude: number;
  longitude: number;
}

function groupByProximity<T extends HasCoords>(posts: T[]): T[][] {
  const groups: T[][] = [];
  const used = new Set<string>();

  for (const post of posts) {
    if (used.has(post.postId)) continue;

    const group = [post];
    used.add(post.postId);

    for (const other of posts) {
      if (used.has(other.postId)) continue;
      if (
        Math.abs(post.latitude - other.latitude) < PROXIMITY_THRESHOLD
        && Math.abs(post.longitude - other.longitude) < PROXIMITY_THRESHOLD
      ) {
        group.push(other);
        used.add(other.postId);
      }
    }

    groups.push(group);
  }

  return groups;
}

/** Spread markers that share the same coordinates so every post stays tappable. */
export function spreadOverlappingMarkers<T extends HasCoords>(
  posts: T[],
): MapPositionedPost<T>[] {
  if (posts.length === 0) return [];

  const result: MapPositionedPost<T>[] = [];

  for (const group of groupByProximity(posts)) {
    if (group.length === 1) {
      const post = group[0];
      result.push({ post, latitude: post.latitude, longitude: post.longitude });
      continue;
    }

    const centerLat = group.reduce((sum, p) => sum + p.latitude, 0) / group.length;
    const centerLng = group.reduce((sum, p) => sum + p.longitude, 0) / group.length;
    const latRad = centerLat * (Math.PI / 180);
    const lngScale = Math.cos(latRad) || 1;

    group.forEach((post, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      const ring = Math.floor(index / 8) + 1;
      const radius = OFFSET_RADIUS_DEG * ring;

      result.push({
        post,
        latitude: centerLat + radius * Math.sin(angle),
        longitude: centerLng + (radius * Math.cos(angle)) / lngScale,
      });
    });
  }

  return result;
}

/** ~5 m — posts closer than this are treated as the same map point */
const PROXIMITY_THRESHOLD = 0.00005;

/** ~10 m offset per ring so stacked markers fan out visibly */
const OFFSET_RADIUS_DEG = 0.00009;

export interface MapPositionedPost<T> {
  post: T;
  latitude: number;
  longitude: number;
  /** Pixel offsets keep a venue's vibe above its 3D house without changing its location. */
  markerOffsetX?: number;
  markerOffsetY?: number;
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

interface ModelPlaceCoords {
  latitude: number;
  longitude: number;
  model3DUrl?: string | null;
}

/**
 * Keep a venue and its vibe/post at the same real coordinate, then lift the
 * vibe visually above the 3D house. A small deterministic horizontal offset
 * keeps multiple vibes at one venue tappable.
 */
export function separatePostsFrom3DPlaces<T extends HasCoords>(
  posts: MapPositionedPost<T>[],
  places: ModelPlaceCoords[],
): MapPositionedPost<T>[] {
  const modelPlaces = places.filter(place => !!place.model3DUrl);
  if (modelPlaces.length === 0) return posts;

  return posts.map(item => {
    const overlap = modelPlaces.find(place =>
      Math.abs(item.latitude - place.latitude) < 0.00014
      && Math.abs(item.longitude - place.longitude) < 0.00014);
    if (!overlap) return item;

    const hash = [...item.post.postId].reduce(
      (value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0,
      7,
    );
    const angle = (hash % 360) * (Math.PI / 180);

    return {
      ...item,
      latitude: overlap.latitude,
      longitude: overlap.longitude,
      markerOffsetX: Math.round(Math.cos(angle) * 28),
      markerOffsetY: -145 - Math.round(Math.abs(Math.sin(angle)) * 12),
    };
  });
}

import {
  getArchivedPosts,
  getMyPosts,
  getNearbyHeatPoints,
  hasPostCoordinates,
  type FeedPost,
  type HeatmapPoint,
} from '../services/postApi';
import { HEATMAP_FETCH_RADIUS_KM } from './mapHeatmap';

function toHeatPoint(post: FeedPost): HeatmapPoint | null {
  if (!hasPostCoordinates(post) || post.latitude == null || post.longitude == null) return null;
  return {
    userId: post.userId,
    latitude: post.latitude,
    longitude: post.longitude,
  };
}

function mergeHeatPoints(points: HeatmapPoint[]): HeatmapPoint[] {
  const merged = new Map<string, HeatmapPoint>();
  points.forEach(point => {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
    const key = `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)},${(point.userId || '').toLowerCase()}`;
    merged.set(key, point);
  });
  return [...merged.values()];
}

/** Active nearby posts + expired/hidden posts (API heatmap, own feed, archive). */
export async function loadMapHeatPoints(
  lat: number,
  lng: number,
): Promise<HeatmapPoint[]> {
  const [apiPoints, myPosts, archived] = await Promise.all([
    getNearbyHeatPoints(lat, lng, HEATMAP_FETCH_RADIUS_KM).catch(() => [] as HeatmapPoint[]),
    getMyPosts().catch(() => [] as FeedPost[]),
    getArchivedPosts().catch(() => [] as FeedPost[]),
  ]);

  const ownWithCoords = [...myPosts, ...archived]
    .map(toHeatPoint)
    .filter((point): point is HeatmapPoint => point != null);

  return mergeHeatPoints([...apiPoints, ...ownWithCoords]);
}

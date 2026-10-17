import { getNearbyOnlinePoints } from '../services/userApi';
import { HEATMAP_FETCH_RADIUS_KM } from './mapHeatmap';
import type { HeatmapPoint } from '../services/postApi';

/** People who are online and sharing location around the viewer. */
export async function loadMapHeatPoints(
  lat: number,
  lng: number,
): Promise<HeatmapPoint[]> {
  return getNearbyOnlinePoints(lat, lng, HEATMAP_FETCH_RADIUS_KM);
}

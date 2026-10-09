import { MAP_FRESH_POST_MIN_ZOOM, MAP_POST_MIN_ZOOM } from '../constants/mapbox';

const FRESH_POST_MS = 24 * 60 * 60 * 1000;

type MapPostZoomInput = {
  createdAt: string;
  visibility?: string | null;
  isAnonymous?: boolean;
};

function isFreshPost(createdAt: string, now: number): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created < FRESH_POST_MS;
}

/** Posts from the last 24 hours show from zoom 10. Older posts need zoom 16.5. Anonymous posts always need 16.5. */
export function postVisibleAtZoom(post: MapPostZoomInput, zoom: number, now = Date.now()): boolean {
  const visibility = (post.visibility || '').trim().toLowerCase();
  const anonymous = post.isAnonymous || visibility === 'anonymous';
  if (anonymous) return zoom >= MAP_POST_MIN_ZOOM;
  const minZoom = isFreshPost(post.createdAt, now) ? MAP_FRESH_POST_MIN_ZOOM : MAP_POST_MIN_ZOOM;
  return zoom >= minZoom;
}

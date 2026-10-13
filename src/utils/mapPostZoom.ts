import { MAP_FRESH_POST_MIN_ZOOM, MAP_POST_MIN_ZOOM } from '../constants/mapbox';

export const POST_LIFETIME_MS = 24 * 60 * 60 * 1000;

type MapPostZoomInput = {
  createdAt: string;
  visibility?: string | null;
  isAnonymous?: boolean;
};

export function isPostWithin24Hours(createdAt: string, now = Date.now()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const age = now - created;
  return age >= 0 && age <= POST_LIFETIME_MS;
}

/** Map posts disappear after 24 hours. Fresh anonymous posts still require the detail zoom. */
export function postVisibleAtZoom(post: MapPostZoomInput, zoom: number, now = Date.now()): boolean {
  if (!isPostWithin24Hours(post.createdAt, now)) return false;
  const visibility = (post.visibility || '').trim().toLowerCase();
  const anonymous = post.isAnonymous || visibility === 'anonymous';
  if (anonymous) return zoom >= MAP_POST_MIN_ZOOM;
  return zoom >= MAP_FRESH_POST_MIN_ZOOM;
}

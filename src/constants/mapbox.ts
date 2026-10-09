export const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiYm9uZHpwcm9ubzEiLCJhIjoiY21yMXExczYwMHMwejJwcHJ1b3NzY216bSJ9.YrjzCaT5z32W_kCTOwQOGw';

/** Place pins appear from this zoom. Friend pins stay visible at every zoom. */
export const MAP_DETAIL_MIN_ZOOM = 13;

/**
 * Friend and public posts from the last 24 hours appear from this zoom.
 * Older posts, and other visibilities, stay at MAP_POST_MIN_ZOOM.
 */
export const MAP_FRESH_POST_MIN_ZOOM = 10;

/**
 * Posts older than 24 hours appear from this zoom.
 */
export const MAP_POST_MIN_ZOOM = 16.5;

/** One-decimal zoom shown on the map, so 16.5 on screen matches the post threshold. */
export function shownMapZoom(zoom: number): number {
  return Math.round(zoom * 10) / 10;
}

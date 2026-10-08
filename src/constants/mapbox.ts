export const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiYm9uZHpwcm9ubzEiLCJhIjoiY21yMXExczYwMHMwejJwcHJ1b3NzY216bSJ9.YrjzCaT5z32W_kCTOwQOGw';

/** Place pins appear from this zoom. Friend pins stay visible at every zoom. */
export const MAP_DETAIL_MIN_ZOOM = 13;

/**
 * User photos and posts appear from this zoom.
 * The normal map view stays below it and shows friends.
 */
export const MAP_POST_MIN_ZOOM = 16.5;

/** One-decimal zoom shown on the map, so 16.5 on screen matches the post threshold. */
export function shownMapZoom(zoom: number): number {
  return Math.round(zoom * 10) / 10;
}

export type HeatInput = {
  latitude: number;
  longitude: number;
  userId?: string;
};

export const HEATMAP_SOURCE_ID = 'mymo-heat';
export const HEATMAP_LAYER_ID = 'mymo-heat-layer';
export const HEATMAP_CIRCLE_LAYER_ID = 'mymo-heat-circles';

/** ~90m cells so posts at the same venue stack as one weighted point. */
const CELL_DEG = 0.0008;

/** Country-scale so expired posts in other cities still heat the map. */
export const HEATMAP_FETCH_RADIUS_KM = 1500;

export type HeatFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { mag: number; count: number };
    geometry: { type: 'Point'; coordinates: [number, number] };
  }>;
};

export const EMPTY_HEAT_GEOJSON: HeatFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

/** Soft pink, small, only around the post cluster. */
export const HEATMAP_PAINT = {
  'heatmap-weight': [
    'interpolate',
    ['linear'],
    ['get', 'mag'],
    0, 0,
    1, 0.45,
    4, 0.8,
    8, 1,
  ],
  'heatmap-intensity': [
    'interpolate',
    ['linear'],
    ['zoom'],
    6, 0.35,
    12, 0.55,
    16, 0.7,
  ],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0, 'rgba(232,80,160,0)',
    0.2, 'rgba(232,80,160,0.12)',
    0.45, 'rgba(232,80,160,0.28)',
    0.7, 'rgba(218,112,214,0.4)',
    1, 'rgba(255,160,200,0.55)',
  ],
  'heatmap-radius': [
    'interpolate',
    ['linear'],
    ['zoom'],
    6, 8,
    11, 16,
    14, 22,
    17, 28,
  ],
  'heatmap-opacity': 0.55,
} as const;

export const NATIVE_HEATMAP_STYLE = {
  heatmapWeight: HEATMAP_PAINT['heatmap-weight'],
  heatmapIntensity: HEATMAP_PAINT['heatmap-intensity'],
  heatmapColor: HEATMAP_PAINT['heatmap-color'],
  heatmapRadius: HEATMAP_PAINT['heatmap-radius'],
  heatmapOpacity: HEATMAP_PAINT['heatmap-opacity'],
};

function cellKey(lat: number, lng: number): string {
  return `${Math.round(lat / CELL_DEG)}_${Math.round(lng / CELL_DEG)}`;
}

/** Heatmap from posts only: cluster nearby pins, weight = số bài trong ô. */
export function buildHeatGeoJSON(posts: HeatInput[]): HeatFeatureCollection {
  const buckets = new Map<string, { lat: number; lng: number; count: number }>();

  posts.forEach(post => {
    if (!Number.isFinite(post.latitude) || !Number.isFinite(post.longitude)) return;
    const key = cellKey(post.latitude, post.longitude);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.lat += post.latitude;
      bucket.lng += post.longitude;
      bucket.count += 1;
    } else {
      buckets.set(key, { lat: post.latitude, lng: post.longitude, count: 1 });
    }
  });

  return {
    type: 'FeatureCollection',
    features: [...buckets.values()].map(bucket => ({
      type: 'Feature',
      properties: { mag: bucket.count, count: bucket.count },
      geometry: {
        type: 'Point',
        coordinates: [bucket.lng / bucket.count, bucket.lat / bucket.count],
      },
    })),
  };
}

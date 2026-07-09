import { MAPBOX_ACCESS_TOKEN } from '../constants/mapbox';

export interface MapGeocodeResult {
  id: string;
  name: string;
  placeName: string;
  lng: number;
  lat: number;
}

interface SearchBoxFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    mapbox_id: string;
    name: string;
    full_address?: string;
    place_formatted?: string;
    address?: string;
  };
}

interface SearchBoxResponse {
  features?: SearchBoxFeature[];
}

interface GeocodingFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
}

interface GeocodingResponse {
  features?: GeocodingFeature[];
}

async function searchWithSearchBox(
  query: string,
  options?: {
    proximity?: { lng: number; lat: number };
    language?: 'vi' | 'en';
    limit?: number;
    signal?: AbortSignal;
  },
): Promise<MapGeocodeResult[]> {
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    q: query,
    limit: String(options?.limit ?? 6),
    language: options?.language ?? 'vi',
    country: 'vn',
    auto_complete: 'true',
    types: 'poi,address,place,locality,neighborhood,street,district',
  });

  if (options?.proximity) {
    params.set('proximity', `${options.proximity.lng},${options.proximity.lat}`);
  }

  const url = `https://api.mapbox.com/search/searchbox/v1/forward?${params}`;
  const response = await fetch(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Search Box error: ${response.status}`);
  }

  const data = await response.json() as SearchBoxResponse;
  return (data.features ?? []).map(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    return {
      id: props.mapbox_id,
      name: props.name,
      placeName: props.full_address
        ?? (props.address && props.place_formatted
          ? `${props.address}, ${props.place_formatted}`
          : props.place_formatted ?? props.name),
      lng,
      lat,
    };
  });
}

async function searchWithGeocodingFallback(
  query: string,
  options?: {
    proximity?: { lng: number; lat: number };
    language?: 'vi' | 'en';
    limit?: number;
    signal?: AbortSignal;
  },
): Promise<MapGeocodeResult[]> {
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    autocomplete: 'true',
    limit: String(options?.limit ?? 6),
    language: options?.language ?? 'vi',
    country: 'vn',
  });

  if (options?.proximity) {
    params.set('proximity', `${options.proximity.lng},${options.proximity.lat}`);
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
  const response = await fetch(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Geocoding error: ${response.status}`);
  }

  const data = await response.json() as GeocodingResponse;
  return (data.features ?? []).map(feature => ({
    id: feature.id,
    name: feature.text,
    placeName: feature.place_name,
    lng: feature.center[0],
    lat: feature.center[1],
  }));
}

export async function searchMapboxPlaces(
  query: string,
  options?: {
    proximity?: { lng: number; lat: number };
    language?: 'vi' | 'en';
    limit?: number;
    signal?: AbortSignal;
  },
): Promise<MapGeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const results = await searchWithSearchBox(trimmed, options);
    if (results.length > 0) return results;
  } catch {
    // fall through to legacy geocoding
  }

  return searchWithGeocodingFallback(trimmed, options);
}

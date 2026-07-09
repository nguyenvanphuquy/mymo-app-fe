import { useState, useEffect, useRef } from 'react';
import { searchMapboxPlaces, type MapGeocodeResult } from '../services/mapGeocodingApi';

interface UseMapGeocodeSearchOptions {
  proximity?: { lng: number; lat: number };
  debounceMs?: number;
}

export function useMapGeocodeSearch(
  query: string,
  options?: UseMapGeocodeSearchOptions,
) {
  const [results, setResults] = useState<MapGeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    const requestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const places = await searchMapboxPlaces(trimmed, {
          proximity: options?.proximity,
          language: 'vi',
          limit: 6,
        });
        if (requestId !== requestIdRef.current) return;
        setResults(places);
        setError(places.length === 0);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, options?.debounceMs ?? 350);

    return () => clearTimeout(timer);
  }, [query, options?.proximity?.lng, options?.proximity?.lat, options?.debounceMs]);

  const trimmed = query.trim();
  const showDropdown = trimmed.length >= 2 && (focused || loading || results.length > 0 || error);

  return {
    results,
    loading,
    error,
    focused,
    setFocused,
    showDropdown,
  };
}

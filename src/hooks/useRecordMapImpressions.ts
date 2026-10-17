import { useEffect, useRef } from 'react';
import { recordMapImpressions } from '../services/placeApi';

type ImpressionPlace = {
  placeId: string;
  isOwnedByCurrentUser: boolean;
};

export function useRecordMapImpressions(places: ImpressionPlace[], enabled: boolean) {
  const seen = useRef(new Set<string>());
  const signature = places
    .filter(place => !place.isOwnedByCurrentUser && place.placeId)
    .map(place => place.placeId)
    .sort()
    .join(',');

  useEffect(() => {
    if (!enabled || !signature) return;
    const day = new Date().toISOString().slice(0, 10);
    const ids = signature.split(',').filter(id => !seen.current.has(`${day}:${id}`));
    if (ids.length === 0) return;

    const timer = setTimeout(() => {
      ids.forEach(id => seen.current.add(`${day}:${id}`));
      void recordMapImpressions(ids).catch(() => {
        ids.forEach(id => seen.current.delete(`${day}:${id}`));
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [enabled, signature]);
}

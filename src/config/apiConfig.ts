/** Production API (Netlify / release builds when env is unset). */
export const PRODUCTION_API_BASE_URL = 'https://beexe-production.up.railway.app';

/** Default when running `expo start` on this machine (web / iOS simulator). */
export const LOCAL_API_BASE_URL = 'http://localhost:5079';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Backend origin without trailing slash.
 * Set EXPO_PUBLIC_API_BASE_URL in `.env` (e.g. http://192.168.1.5:5079 for phone on Wi‑Fi).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return LOCAL_API_BASE_URL;
  }

  return PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
export const AUTH_API_URL = `${API_URL}/Auth`;
export const CHAT_HUB_URL = `${API_BASE_URL}/hubs/chat`;
export const MAP_HUB_URL = `${API_BASE_URL}/hubs/map`;

/**
 * OAuth 2.0 Web client ID (Google Cloud Console).
 *
 * Web (Expo): Google Cloud → Credentials → OAuth client (Web)
 * - Authorized JavaScript origins: http://localhost:8081 (and your production URL)
 * - No redirect URI needed for @react-oauth/google (GIS credential flow)
 *
 * Native app build (Expo AuthSession): also add Authorized redirect URIs, e.g. mymo://oauth
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  '135864939755-jcsv55mvu7hooh1inptb3rmfhu4cgrkg.apps.googleusercontent.com';

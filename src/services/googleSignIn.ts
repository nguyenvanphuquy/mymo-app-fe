import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { GOOGLE_WEB_CLIENT_ID } from '../config/googleAuth';

WebBrowser.maybeCompleteAuthSession();

/** Redirect URI for native / Expo OAuth — add exact value in Google Cloud Console if using app build. */
export function getGoogleOAuthRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return makeRedirectUri({
    scheme: 'mymo',
    path: 'oauth',
    preferLocalhost: true,
  });
}

export function useGoogleIdTokenSignIn() {
  const redirectUri = getGoogleOAuthRedirectUri();

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri,
    },
    { scheme: 'mymo', path: 'oauth', preferLocalhost: true },
  );

  const signInAsync = async (): Promise<string | null> => {
    const result = await promptAsync();
    if (result.type !== 'success') return null;

    const fromParams = result.params?.id_token;
    if (typeof fromParams === 'string' && fromParams.length > 0) return fromParams;

    const auth = result.authentication as { idToken?: string } | undefined;
    if (auth?.idToken) return auth.idToken;

    return null;
  };

  return { signInAsync, ready: Boolean(request), redirectUri };
}

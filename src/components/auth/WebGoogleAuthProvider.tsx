import React from 'react';
import { Platform } from 'react-native';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_WEB_CLIENT_ID } from '../../config/googleAuth';

export function WebGoogleAuthProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

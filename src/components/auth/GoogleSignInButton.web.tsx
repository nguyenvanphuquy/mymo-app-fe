import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Colors } from '../../constants/colors';

type Props = {
  onIdToken: (idToken: string) => void;
  onError?: () => void;
  disabled?: boolean;
};

/** Web: Google Identity Services (no OAuth redirect_uri — avoids redirect_uri_mismatch). */
export default function GoogleSignInButton({ onIdToken, onError, disabled }: Props) {
  if (disabled) {
    return <View style={[styles.wrap, styles.disabled]} />;
  }

  return (
    <View style={styles.wrap}>
        <GoogleLogin
          type="icon"
          shape="circle"
          size="large"
          useOneTap={false}
          auto_select={false}
          onSuccess={(res: CredentialResponse) => {
          if (res.credential) onIdToken(res.credential);
          else onError?.();
        }}
        onError={() => onError?.()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  disabled: { opacity: 0.45 },
});

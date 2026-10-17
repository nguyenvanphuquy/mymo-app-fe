import React from 'react';
import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function isVideoMedia(mediaType?: string | null, uri?: string | null): boolean {
  if (mediaType && /video/i.test(mediaType)) return true;
  return !!uri && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(uri);
}

interface MomentMediaProps {
  uri: string;
  mediaType?: string | null;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
}

/** Plays a moment video on web. Other platforms show the still frame. */
export default function MomentMedia({ uri, mediaType, style, resizeMode = 'cover' }: MomentMediaProps) {
  if (isVideoMedia(mediaType, uri) && Platform.OS === 'web') {
    return (
      <View style={[styles.fill, style]}>
        {React.createElement('video', {
          src: uri,
          autoPlay: true,
          loop: true,
          muted: true,
          playsInline: true,
          style: {
            width: '100%',
            height: '100%',
            objectFit: resizeMode,
            backgroundColor: '#000',
          },
        })}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.fill, style]}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});

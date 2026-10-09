import React from 'react';
import { Image, StyleSheet } from 'react-native';

import type { BeautyFilterId } from '../constants/beautyFilters';

type FilteredPhotoProps = {
  uri: string;
  filterId: BeautyFilterId;
};

/** Web capture already bakes the matrix into the image. */
export default function FilteredPhoto({ uri }: FilteredPhotoProps) {
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
}

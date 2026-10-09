import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { ColorMatrix } from 'react-native-color-matrix-image-filters';

import { getBeautyFilter, type BeautyFilterId } from '../constants/beautyFilters';

type FilteredPhotoProps = {
  uri: string;
  filterId: BeautyFilterId;
};

/** Native preview uses the color-matrix filter on the captured photo. */
export default function FilteredPhoto({ uri, filterId }: FilteredPhotoProps) {
  const filter = getBeautyFilter(filterId);

  return (
    <ColorMatrix matrix={filter.matrix} style={StyleSheet.absoluteFill}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </ColorMatrix>
  );
}

import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

const FAMILIES: Record<string, string> = {
  '100': 'Nunito_400Regular',
  '200': 'Nunito_400Regular',
  '300': 'Nunito_400Regular',
  '400': 'Nunito_400Regular',
  normal: 'Nunito_400Regular',
  '500': 'Nunito_500Medium',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  bold: 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_900Black',
};

/** Map fontWeight onto a real Nunito file so Android does not faux-bold. */
export function nunitoStyle(style: StyleProp<TextStyle>) {
  const flat = StyleSheet.flatten(style);
  const weight = flat?.fontWeight == null ? '400' : String(flat.fontWeight);
  const fontFamily = FAMILIES[weight] ?? 'Nunito_400Regular';
  return [style, { fontFamily, fontWeight: 'normal' as const }];
}

export const Text = React.forwardRef<RNText, TextProps>(function Text(props, ref) {
  return <RNText {...props} ref={ref} style={nunitoStyle(props.style)} />;
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  return <RNTextInput {...props} ref={ref} style={nunitoStyle(props.style)} />;
});

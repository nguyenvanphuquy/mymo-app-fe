import { useWindowDimensions } from 'react-native';

export const APP_MAX_WIDTH = 500;

export function useAppContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, APP_MAX_WIDTH);
}

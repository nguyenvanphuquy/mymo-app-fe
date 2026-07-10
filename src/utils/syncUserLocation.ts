import * as Location from 'expo-location';
import { updateUserLocation } from '../services/userApi';

/** Push current device coordinates to the server (after sharing is re-enabled). */
export async function syncCurrentLocationToServer(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  await updateUserLocation(position.coords.latitude, position.coords.longitude);
  return true;
}

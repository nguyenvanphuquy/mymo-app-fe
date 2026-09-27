import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

export type WeatherKind = 'sunny' | 'cloudy' | 'rain' | 'thunder' | 'snow' | 'fog';

export interface WeatherCurrent {
  tempC: number;
  isDay: boolean;
  kind: WeatherKind;
}

interface ApiResponse<T> {
  success?: boolean;
  Success?: boolean;
  data?: T;
  Data?: T;
}

interface WeatherData {
  tempC?: number;
  TempC?: number;
  isDay?: boolean;
  IsDay?: boolean;
  kind?: string;
  Kind?: string;
}

const KINDS: WeatherKind[] = ['sunny', 'cloudy', 'rain', 'thunder', 'snow', 'fog'];

export async function getCurrentWeather(lat: number, lng: number): Promise<WeatherCurrent | null> {
  const token = await AsyncStorage.getItem('mymo.accessToken');
  if (!token) return null;

  const res = await fetch(
    `${API_URL}/weather/current?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;

  const body = (await res.json()) as ApiResponse<WeatherData>;
  const success = body.success ?? body.Success ?? false;
  const data = body.data ?? body.Data;
  if (!success || !data) return null;

  const kindRaw = String(data.kind ?? data.Kind ?? 'cloudy');
  const kind = KINDS.includes(kindRaw as WeatherKind) ? (kindRaw as WeatherKind) : 'cloudy';
  const temp = data.tempC ?? data.TempC;
  if (typeof temp !== 'number') return null;

  return {
    tempC: temp,
    isDay: Boolean(data.isDay ?? data.IsDay ?? true),
    kind,
  };
}

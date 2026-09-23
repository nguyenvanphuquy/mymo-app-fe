import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mymo.businessOnboardingDone';

export async function hasCompletedBusinessOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function setBusinessOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}

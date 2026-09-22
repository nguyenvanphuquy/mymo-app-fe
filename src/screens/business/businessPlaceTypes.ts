export type BusinessPlaceFormValues = {
  name: string;
  categoryId: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  openingHours: string;
  thumbnailUrl: string;
};

export const emptyPlaceForm = (categoryId = ''): BusinessPlaceFormValues => ({
  name: '',
  categoryId,
  description: '',
  address: '',
  latitude: '16.0544',
  longitude: '108.2022',
  phone: '',
  openingHours: '07:00 - 22:00',
  thumbnailUrl: '',
});

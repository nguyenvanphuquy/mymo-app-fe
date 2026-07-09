import { Platform } from 'react-native';

/**
 * Build multipart FormData for image upload.
 * Web: fetch blob/data URI into a real Blob.
 * Native: use { uri, name, type } object.
 */
export async function buildImageFormData(
  uri: string,
  fileName: string,
  fileType: string,
): Promise<FormData> {
  const formData = new FormData();
  const normalizedType = fileType === 'image/jpg' ? 'image/jpeg' : fileType;
  const safeName = fileName.includes('.') ? fileName : `${fileName}.jpg`;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('file', blob, safeName);
  } else {
    formData.append('file', {
      uri,
      name: safeName,
      type: normalizedType,
    } as unknown as Blob);
  }

  return formData;
}

export function guessImageMeta(uri: string, fallbackName = 'photo.jpg') {
  const fromPath = uri.split('/').pop()?.split('?')[0];
  const fileName = fromPath && fromPath.includes('.') ? fromPath : fallbackName;
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const fileType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  return { fileName, fileType };
}

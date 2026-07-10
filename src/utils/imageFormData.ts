import { Platform } from 'react-native';

/**
 * Build multipart FormData for image upload.
 * Web: fetch blob/data URI into a real File/Blob (required by browsers).
 * Native: use { uri, name, type } object for React Native FormData.
 */
export async function buildImageFormData(
  uri: string,
  fileName: string,
  fileType: string,
  fieldName = 'file',
): Promise<FormData> {
  const formData = new FormData();
  const normalizedType = fileType === 'image/jpg' ? 'image/jpeg' : fileType;
  const safeName = fileName.includes('.') ? fileName : `${fileName}.jpg`;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const type = blob.type && blob.type !== 'application/octet-stream'
      ? blob.type
      : normalizedType;
    const file = new File([blob], safeName, { type });
    formData.append(fieldName, file, safeName);
  } else {
    formData.append(fieldName, {
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
  const normalizedExt = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext;
  const fileType = `image/${normalizedExt}`;
  return { fileName, fileType };
}

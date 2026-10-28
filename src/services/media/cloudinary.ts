import { Asset, launchImageLibrary } from 'react-native-image-picker';
import { apiRequest } from '../api/client';

type Signature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};
type UploadedMedia = {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
};

export async function pickMedia(mediaType: 'photo' | 'video') {
  const result = await launchImageLibrary({
    mediaType,
    selectionLimit: 10,
    videoQuality: 'high',
  });
  if (result.didCancel) return [];
  if (result.errorCode)
    throw new Error(result.errorMessage ?? 'Unable to select media.');
  return result.assets ?? [];
}

export async function uploadMedia(
  asset: Asset,
  accessToken: string,
): Promise<UploadedMedia> {
  if (!asset.uri || !asset.type)
    throw new Error('Selected media is missing a file URI or type.');
  const signature = await apiRequest<Signature>(
    '/uploads/signature',
    {},
    accessToken,
  );
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    type: asset.type,
    name: asset.fileName ?? `connectly-${Date.now()}`,
  } as unknown as Blob);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('folder', signature.folder);
  form.append('signature', signature.signature);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`,
    { method: 'POST', body: form as any },
  );
  if (!response.ok) throw new Error('Media upload failed.');
  const data = (await response.json()) as {
    secure_url: string;
    resource_type: 'image' | 'video';
    eager?: { secure_url: string }[];
  };
  return {
    url: data.secure_url,
    type: data.resource_type === 'video' ? 'video' : 'image',
    thumbnailUrl: data.eager?.[0]?.secure_url,
  };
}

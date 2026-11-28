import { AVATAR_MIMES, type AvatarMime } from '@ab/shared';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@ab/mobile-kit';
import { ensureCameraPermission } from '@/core/lib/receipts/camera-permission';
import { decodeBase64 } from '@/core/lib/receipts/receipt';

export type AvatarSource = 'camera' | 'library';

/** A picked profile photo, ready for POST /me/avatar/upload-url and the signed upload. */
export interface PickedAvatar {
  /** Local file, for the preview. */
  uri: string;
  mime: AvatarMime;
  /** An ArrayBuffer: React Native uploads it reliably, a Blob it does not (as the receipt). */
  bytes: ArrayBuffer;
  size: number;
}

/** Square JPEG 0.7 (sharp face, far under the 2 MB bucket limit), no EXIF (no location). */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
  base64: true,
  exif: false,
};

/** The asset keeps its type when the bucket takes it, else it is re-encoded as JPEG. */
export function toAvatar(asset: ImagePicker.ImagePickerAsset): PickedAvatar | null {
  if (!asset.base64) return null;
  const bytes = decodeBase64(asset.base64);
  const mime = AVATAR_MIMES.find((m) => m === asset.mimeType) ?? 'image/jpeg';
  return { uri: asset.uri, mime, bytes, size: bytes.byteLength };
}

/** Gallery needs no permission; null when cancelled or refused. */
export async function pickAvatar(source: AvatarSource): Promise<PickedAvatar | null> {
  const copy = { rationale: t.account.mobile.cameraRationale, confirm: t.account.avatar.camera };
  if (source === 'camera' && !(await ensureCameraPermission(copy))) return null;
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? toAvatar(asset) : null;
}

import { RECEIPT_MIMES } from '@ab/shared';
import * as ImagePicker from 'expo-image-picker';
import { ensureCameraPermission } from './camera-permission';

export type ReceiptSource = 'camera' | 'library';
export type ReceiptMime = (typeof RECEIPT_MIMES)[number];

/** A picked receipt photo, ready for POST /payments/receipt-upload-url and the signed upload. */
export interface Receipt {
  /** Local file, for the thumbnail. */
  uri: string;
  mime: ReceiptMime;
  /** The compressed image. An ArrayBuffer: React Native uploads it reliably, a Blob it does not. */
  bytes: ArrayBuffer;
  size: number;
}

/**
 * Compressed (JPEG quality 0.6: a transfer slip stays readable, far under the 10 MB bucket limit),
 * no EXIF (no location on a payment record), and the bytes as base64 for the upload.
 */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.6,
  base64: true,
  exif: false,
};

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** The picker's asset as a receipt; its own image type when the bucket takes it, else JPEG. */
export function toReceipt(asset: ImagePicker.ImagePickerAsset): Receipt | null {
  if (!asset.base64) return null;
  const bytes = decodeBase64(asset.base64);
  const mime =
    RECEIPT_MIMES.find((m) => m !== 'application/pdf' && m === asset.mimeType) ?? 'image/jpeg';
  return { uri: asset.uri, mime, bytes, size: bytes.byteLength };
}

/**
 * «صوّر الإيصال» (camera, after the permission flow) or «اختار من الصور» (the system photo
 * picker, no permission needed). null when cancelled or refused.
 */
export async function pickReceipt(source: ReceiptSource): Promise<Receipt | null> {
  if (source === 'camera' && !(await ensureCameraPermission())) return null;
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? toReceipt(asset) : null;
}

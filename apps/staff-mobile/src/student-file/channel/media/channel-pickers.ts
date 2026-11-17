import type { ChannelPickedFile } from '@ab/mobile-kit';
import * as DocumentPicker from 'expo-document-picker';
import { decodeBase64 } from '@/core/lib/receipts/receipt';
import { pickReceipt } from '@/payments';

const PDF = 'application/pdf';

/** A compressed JPEG or PNG from the receipts' picker (no EXIF), named by its type. */
async function pickPhoto(source: 'library' | 'camera'): Promise<ChannelPickedFile | null> {
  const photo = await pickReceipt(source);
  if (!photo) return null;
  const name = photo.mime === 'image/png' ? 'photo.png' : 'photo.jpg';
  return { mime: photo.mime, name, size: photo.size, bytes: photo.bytes };
}

/**
 * A photo for the student chat from the phone's photos (the receipts' picker: compressed JPEG or
 * PNG, no EXIF, no permission needed); null when cancelled.
 */
export const pickChannelPhoto = (): Promise<ChannelPickedFile | null> => pickPhoto('library');

/** A PDF from the phone's files, its bytes from the picker's base64 (no file-system module). */
export async function pickChannelPdf(): Promise<ChannelPickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PDF,
    copyToCacheDirectory: true,
    base64: true,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset?.base64) return null;
  const bytes = decodeBase64(asset.base64);
  return { mime: asset.mimeType ?? PDF, name: asset.name, size: bytes.byteLength, bytes };
}

/** A photo taken now with the camera (the receipts' picker asks for the camera first). */
export const pickChannelCamera = (): Promise<ChannelPickedFile | null> => pickPhoto('camera');

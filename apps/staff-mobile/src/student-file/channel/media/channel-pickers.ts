import type { ChannelPickedFile } from '@ab/mobile-kit';
import { pickReceipt } from '@/payments';

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

/** A photo taken now with the camera (the receipts' picker asks for the camera first). */
export const pickChannelCamera = (): Promise<ChannelPickedFile | null> => pickPhoto('camera');

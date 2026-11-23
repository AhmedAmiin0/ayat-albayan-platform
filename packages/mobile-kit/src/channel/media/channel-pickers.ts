import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { ChannelPickedFile } from '../media-port';

// The chat's pickers on both phones: a PDF from the phone's files and (the family app's) a photo
// from its photos or the camera. Bytes come from the picker's base64 (no file-system module).

const PDF = 'application/pdf';

/** The picker's base64 as bytes (an ArrayBuffer: React Native uploads it reliably). */
function bytesOf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0)).buffer;
}

/** A PDF from the phone's files, with its own name; null when cancelled. */
export async function pickChannelPdf(): Promise<ChannelPickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PDF,
    copyToCacheDirectory: true,
    base64: true,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset?.base64) return null;
  const bytes = bytesOf(asset.base64);
  return { mime: asset.mimeType ?? PDF, name: asset.name, size: bytes.byteLength, bytes };
}

/**
 * Compressed JPEG (quality 0.7: a homework page stays readable, far under the 10 MB cap), no EXIF
 * (no location in a chat), the bytes as base64. The picker re-encodes, so the bytes are JPEG.
 */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.7,
  base64: true,
  exif: false,
};

/** The camera asks first; the system photo picker needs no permission. */
const LAUNCH: Readonly<Record<'library' | 'camera', () => Promise<ImagePicker.ImagePickerResult>>> =
  {
    library: () => ImagePicker.launchImageLibraryAsync(OPTIONS),
    camera: async () => {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      return allowed.granted
        ? ImagePicker.launchCameraAsync(OPTIONS)
        : { canceled: true, assets: null };
    },
  };

/** A photo for the chat from the phone's photos or the camera; null when cancelled or refused. */
export async function pickChannelImage(
  source: 'library' | 'camera',
): Promise<ChannelPickedFile | null> {
  const result = await LAUNCH[source]();
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset?.base64) return null;
  const bytes = bytesOf(asset.base64);
  return { mime: 'image/jpeg', name: 'photo.jpg', size: bytes.byteLength, bytes };
}

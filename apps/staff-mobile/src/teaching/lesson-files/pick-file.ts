import type { PickedFile } from '@ab/client-core';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@ab/mobile-kit';
import { ensureCameraPermission } from '@/payments';

// Bytes are read with fetch(uri).arrayBuffer(), since the APK has no file-system module.

export const PICK_SOURCES = ['gallery', 'camera', 'document'] as const;
export type PickSource = (typeof PICK_SOURCES)[number];

/** A picked file (its bytes, name, type and size), or null when the user backed out. */
type PickFile = (source: PickSource) => Promise<PickedFile | null>;

/** The picked asset before its bytes are read. */
interface Picked {
  uri: string;
  name: string;
  mime: string;
}

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.8 };
const DOCUMENT_TYPES = ['application/pdf', 'audio/*', 'image/*'];
const CAMERA_COPY = {
  rationale: t.lessonFiles.cameraRationale,
  confirm: t.inbox.composer.takePhoto,
};

/** The picker's photo; a camera shot has no name of its own. */
function fromImage(result: ImagePicker.ImagePickerResult): Picked | null {
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const mime = asset.mimeType ?? 'image/jpeg';
  return { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mime };
}

function fromDocument(result: DocumentPicker.DocumentPickerResult): Picked | null {
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, name: asset.name, mime: asset.mimeType ?? 'application/octet-stream' };
}

/** The camera opens only after its permission (our Arabic reason first). */
async function fromCamera(): Promise<Picked | null> {
  const allowed = await ensureCameraPermission(CAMERA_COPY);
  return allowed ? fromImage(await ImagePicker.launchCameraAsync(IMAGE_OPTIONS)) : null;
}

const PICKERS: Readonly<Record<PickSource, () => Promise<Picked | null>>> = {
  gallery: async () => fromImage(await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS)),
  camera: fromCamera,
  document: async () =>
    fromDocument(
      await DocumentPicker.getDocumentAsync({ type: DOCUMENT_TYPES, copyToCacheDirectory: true }),
    ),
};

/** Its bytes, with the size the upload checks (25 MiB). */
async function withBytes(picked: Picked): Promise<PickedFile> {
  const body = await (await fetch(picked.uri)).arrayBuffer();
  return { name: picked.name, mime: picked.mime, size: body.byteLength, body };
}

export const pickFile: PickFile = async (source) => {
  const picked = await PICKERS[source]();
  return picked ? withBytes(picked) : null;
};

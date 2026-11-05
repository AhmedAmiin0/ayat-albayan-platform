import { CHAT_FILE_MIMES, chatFileProblem } from '@ab/shared';
import { ChatFileError, type ChatFilePick, pdfName } from '@/inbox/composer/send-file';
import { loadManipulator } from './load-manipulator';
import type { SharedFile } from './read-share';
import { sharedKind } from './share-rules';

// docs/38 §mobile 10: a shared file as the chat's file send takes it. Photos are always re-encoded
// to JPEG (longest side 1600 px, quality 0.7: no EXIF, no location, under Meta's 5 MB).

const LONGEST_SIDE = 1600;
const QUALITY = 0.7;
const PDF = 'application/pdf';
const JPEG = 'image/jpeg';

const fail = (code: ChatFileError['code']) => (): never => {
  throw new ChatFileError(code);
};

/** The cached copy's bytes; a missing or empty copy (the native copy failed) is file_upload. */
async function readBytes(uri: string): Promise<ArrayBuffer> {
  const bytes = await fetch(uri)
    .then((res) => res.arrayBuffer())
    .catch(fail('file_upload'));
  return bytes.byteLength > 0 ? bytes : fail('file_upload')();
}

/** The copy's size from a Blob (native memory), before a PDF of unknown size is read into JS. */
async function readSize(uri: string): Promise<number> {
  return fetch(uri)
    .then((res) => res.blob())
    .then((blob) => blob.size)
    .catch(fail('file_upload'));
}

/** Rendered, scaled down when over 1600 px, saved as JPEG (loaded lazily: loadManipulator). */
async function reencode(uri: string): Promise<string> {
  const { ImageManipulator, SaveFormat } = await loadManipulator();
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const wide = image.width >= image.height;
  const fits = Math.max(image.width, image.height) <= LONGEST_SIDE;
  const size = wide ? { width: LONGEST_SIDE } : { height: LONGEST_SIDE };
  const sized = fits ? image : await ImageManipulator.manipulate(image).resize(size).renderAsync();
  const saved = await sized.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY });
  return saved.uri;
}

async function photo(item: SharedFile): Promise<ChatFilePick> {
  // A decode failure (an SVG, a broken file) is the type's fault, not the upload's.
  const uri = await reencode(item.uri).catch(fail('file_type'));
  const bytes = await readBytes(uri);
  return { mime: JPEG, bytes, size: bytes.byteLength, filename: `photo-${String(item.n)}.jpg` };
}

async function pdf(item: SharedFile, maxBytes: number): Promise<ChatFilePick> {
  const size = item.size ?? (await readSize(item.uri));
  const early = chatFileProblem({ mime: PDF, size, maxBytes }, CHAT_FILE_MIMES);
  if (early) throw new ChatFileError(early);
  const bytes = await readBytes(item.uri);
  return { mime: PDF, bytes, size: bytes.byteLength, filename: pdfName(item.name) };
}

type Make = (item: SharedFile, maxBytes: number) => Promise<ChatFilePick>;

const MAKE: Record<ReturnType<typeof sharedKind>, Make> = {
  image: photo,
  pdf,
  other: () => Promise.reject(new ChatFileError('file_type')),
};

/** The file ready for sendChatFile, or a ChatFileError (file_type, file_too_large, file_upload). */
export function toChatFile(item: SharedFile, maxBytes: number): Promise<ChatFilePick> {
  return MAKE[sharedKind(item)](item, maxBytes);
}

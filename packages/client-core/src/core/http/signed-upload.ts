import { storageProviderOf, type SignedUpload, type StorageProvider } from '@ab/shared';

// One upload path for web and mobile (docs/45): the API signs a slot in the storage that keeps
// new files. A «minio:» path is a plain PUT to its signed URL (files.ayatalbayan.com); any other
// path is a Supabase Storage slot, uploaded the way it always was (the app's supabase-js client).

/** The bytes to send and their mime type (the server checks both again). */
export interface UploadFile {
  body: Blob | ArrayBuffer | Uint8Array<ArrayBuffer>;
  contentType: string;
}

/** The app's Supabase upload (storage.from(bucket).uploadToSignedUrl); resolves or throws. */
export type SupabaseSlotUpload = (signed: SignedUpload, file: UploadFile) => Promise<void>;

type Uploader = (
  signed: SignedUpload,
  file: UploadFile,
  supabase: SupabaseSlotUpload,
) => Promise<void>;

/** Thrown when the storage refused the PUT (the caller shows its own «upload failed»). */
export class SignedUploadError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`upload failed: ${status}`);
    this.status = status;
  }
}

async function putToSignedUrl(signed: SignedUpload, file: UploadFile): Promise<void> {
  const res = await fetch(signed.signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.contentType },
    body: file.body,
  });
  if (!res.ok) throw new SignedUploadError(res.status);
}

const UPLOADERS: Record<StorageProvider, Uploader> = {
  supabase: (signed, file, supabase) => supabase(signed, file),
  minio: (signed, file) => putToSignedUrl(signed, file),
};

/** Uploads to the slot the API signed, wherever it lives; resolves once the file is stored. */
export function uploadToSlot(
  signed: SignedUpload,
  file: UploadFile,
  supabase: SupabaseSlotUpload,
): Promise<void> {
  return UPLOADERS[storageProviderOf(signed.path)](signed, file, supabase);
}

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

/**
 * The slot is signed for exactly the file the app declared at …/upload-url (docs/45): its
 * Content-Type (the same mime, sent here), its Content-Length (fetch sets it from these bytes, the
 * size declared) and If-None-Match: * (one upload per key). MinIO refuses a PUT that differs.
 */
async function putToSignedUrl(signed: SignedUpload, file: UploadFile): Promise<void> {
  const res = await fetch(signed.signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.contentType, 'If-None-Match': '*' },
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

/** Same shape as supabase-js: `error` is set when the storage refused the file. */
export interface SlotUploadResult {
  error: Error | null;
}

/**
 * A bucket of the app's supabase-js client (web and mobile pass `(b) => supabase.storage.from(b)`).
 * supabase-js's own four parameters, as a tuple: they are not ours to merge into one object.
 */
export type SlotBucket = (bucket: string) => {
  uploadToSignedUrl(
    ...args: [
      path: string,
      token: string,
      body: UploadFile['body'],
      options: { contentType: string },
    ]
  ): Promise<{ error: Error | null }>;
};

const asError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

/**
 * The app's one upload function over its own supabase-js client: resolves `{ error }` and never
 * rejects, so each call site keeps its own `if (error) throw …`.
 */
export function slotUploader(bucketOf: SlotBucket) {
  const supabase: SupabaseSlotUpload = async (signed, file) => {
    const { error } = await bucketOf(signed.bucket).uploadToSignedUrl(
      signed.path,
      signed.token,
      file.body,
      { contentType: file.contentType },
    );
    if (error) throw error;
  };
  return async (signed: SignedUpload, file: UploadFile): Promise<SlotUploadResult> => {
    try {
      await uploadToSlot(signed, file, supabase);
      return { error: null };
    } catch (e) {
      return { error: asError(e) };
    }
  };
}

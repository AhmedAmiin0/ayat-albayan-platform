import { uploadToSlot, type SupabaseSlotUpload, type UploadFile } from '@ab/client-core';
import type { SignedUpload } from '@ab/shared';
import { supabase } from './supabase';

// The app's one direct upload (docs/45): the API signs a slot, the stored path's marker says where
// it lives («minio:» → a PUT to its signed URL, anything else → Supabase Storage as before).

/** Same shape as supabase-js: `error` is set when the storage refused the file. */
interface SlotUploadResult {
  error: Error | null;
}

const supabaseUpload: SupabaseSlotUpload = async (signed, file) => {
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file.body, { contentType: file.contentType });
  if (error) throw error;
};

const asError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

/** Uploads the file to the slot the API signed; resolves `{ error }` and never rejects. */
export async function uploadSigned(
  signed: SignedUpload,
  file: UploadFile,
): Promise<SlotUploadResult> {
  try {
    await uploadToSlot(signed, file, supabaseUpload);
    return { error: null };
  } catch (e) {
    return { error: asError(e) };
  }
}

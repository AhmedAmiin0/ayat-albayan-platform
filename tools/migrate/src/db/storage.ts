// Target Storage (report PDFs → bucket `reports`, object `{student_id}/{lesson_id}.pdf` per
// migration 122; lesson_reports.pdf_path stores that object name). Service role over the
// Supabase API; idempotent: an existing object is kept.
import { createClient } from '@supabase/supabase-js';
import type { StorageConfig } from '../config.ts';

export interface TargetStorage {
  /** false when the object already existed (left untouched). */
  upload(o: {
    bucket: string;
    path: string;
    bytes: Uint8Array;
    contentType: string;
  }): Promise<boolean>;
}

export function createTargetStorage(config: StorageConfig): TargetStorage {
  const db = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async upload(o) {
      const { error } = await db.storage
        .from(o.bucket)
        .upload(o.path, o.bytes, { contentType: o.contentType, upsert: false });
      if (!error) return true;
      if (/exists|duplicate/i.test(error.message)) return false;
      throw new Error(`storage ${o.bucket}/${o.path}: ${error.message}`);
    },
  };
}

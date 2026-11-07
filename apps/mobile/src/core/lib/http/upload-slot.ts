import { slotUploader } from '@ab/client-core';
import { supabase } from './supabase';

// The app's one direct upload (docs/45): the API signs a slot, the stored path's marker says where
// it lives («minio:» → a PUT to its signed URL, anything else → Supabase Storage as before).
// Resolves `{ error }` like supabase-js and never rejects (client-core slotUploader).
export const uploadSigned = slotUploader((bucket) => supabase.storage.from(bucket));

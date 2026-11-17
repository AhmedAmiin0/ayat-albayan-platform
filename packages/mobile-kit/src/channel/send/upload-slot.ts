import { slotUploader } from '@ab/client-core';
import { supabase } from '../../lib/http/supabase';

// The chat's file upload (docs/45): the API signs a slot, its stored path says where it lives
// («minio:» → a PUT to the signed URL, else Supabase Storage). Resolves `{ error }`, never rejects.
export const uploadSigned = slotUploader((bucket) => supabase.storage.from(bucket));

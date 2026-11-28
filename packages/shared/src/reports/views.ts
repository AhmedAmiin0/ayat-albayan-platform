// Phase 3 report responses (docs/11 §4). snake_case rows like every API response; instants are
// ISO-8601 UTC strings.

export interface ReportAttachmentView {
  id: string;
  storage_path: string;
  mime: string;
  size: number;
  created_at: string;
}

/** A signed URL to PUT a file to (Storage createSignedUploadUrl). */
export interface SignedUpload {
  bucket: string;
  path: string;
  token: string;
  signed_url: string;
}

/** A signed URL to GET a private file. */
export interface SignedDownload {
  url: string;
  expires_at: string;
}

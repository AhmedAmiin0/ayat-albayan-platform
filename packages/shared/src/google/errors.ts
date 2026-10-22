// google_sync_items.last_error / google_account.last_error hold short codes (never a token):
// the apps show them through ar.json googleSync.errors.<key>, anything else as «other» with the code.

export const GOOGLE_ERROR_KEYS = [
  'invalid_grant',
  'invalid_client',
  'not_platform_event',
  'not_platform_file',
  'deleted_in_google',
  'row_deleted_in_google',
  'pdf_not_synced',
  'summary_row_other_folder',
] as const;
export type GoogleErrorKey = (typeof GOOGLE_ERROR_KEYS)[number] | 'other';

export const googleErrorKey = (code: string): GoogleErrorKey => GOOGLE_ERROR_KEYS.find((k) => k === code) ?? 'other';

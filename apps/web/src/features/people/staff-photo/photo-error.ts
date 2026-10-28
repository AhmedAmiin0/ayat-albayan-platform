import { accountMessage } from '@/features/people/account';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

const OWN: Record<string, string | undefined> = t.staffPhoto.errors;
/** The file checks shared with «حسابي» (account.errors.*). */
const FILE_CODES = new Set(['avatar_type', 'avatar_too_large', 'avatar_path']);

function codeOf(error: unknown): string {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null)
    return '';
  const body = error.body;
  return 'code' in body && typeof body.code === 'string' ? body.code : '';
}

/** The text of a failed staff-photo write: 400 avatar_not_staff, a file check, else «تعذّر حفظ الصورة». */
export function photoErrorText(error: unknown): string {
  const code = codeOf(error);
  if (FILE_CODES.has(code)) return accountMessage(code);
  return OWN[code] ?? t.staffPhoto.errors.generic;
}

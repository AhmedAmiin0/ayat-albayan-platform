import { accountMessage } from '@/features/people/account';
import { ApiError, t } from '@ab/web-kit';

const OWN: Record<string, string | undefined> = t.staffPhoto.errors;
const FILE_CODES = new Set(['avatar_type', 'avatar_too_large', 'avatar_path']);

function codeOf(error: unknown): string {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null)
    return '';
  const body = error.body;
  return 'code' in body && typeof body.code === 'string' ? body.code : '';
}

export function photoErrorText(error: unknown): string {
  const code = codeOf(error);
  if (FILE_CODES.has(code)) return accountMessage(code);
  return OWN[code] ?? t.staffPhoto.errors.generic;
}

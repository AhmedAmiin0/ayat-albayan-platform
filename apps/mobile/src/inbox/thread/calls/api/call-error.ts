import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

type CallErrorKey = keyof typeof t.calls.errors;

/** The API's `code` → its sentence (t.calls.errors); anything else is «تعذّر إجراء المكالمة». */
export function callErrorText(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const code = typeof body === 'object' && body !== null && 'code' in body ? String(body.code) : '';
  const known = Object.hasOwn(t.calls.errors, code) ? (code as CallErrorKey) : null;
  if (known) return t.calls.errors[known];
  if (code.startsWith('permission_')) return t.calls.errors.no_permission;
  return t.calls.errors.call_failed;
}

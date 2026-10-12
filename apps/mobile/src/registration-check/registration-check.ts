import { normalizePhone, REGISTRATION_NAME_MIN, type RegistrationCheckView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch, toQueryString } from '@/lib/api';
import { t } from '@/lib/i18n';

// «التحقق من التسجيل» (owner 2026-10-12, docs/16 row 23): is this family / child already a student?
// GET /sales/registration-check by the guardian's phone (E.164) or a name / code. The checks the API
// makes (one_of, invalid_phone, query_too_short) run here first so a short name never leaves the phone.

export type CheckBy = 'phone' | 'name';
export type CheckSearch = { by: 'phone'; phone: string } | { by: 'name'; q: string };
export type CheckErrorCode = keyof typeof t.registrationCheck.error;
export type SearchResult = { search: CheckSearch } | { error: CheckErrorCode };

/** What she typed as the API's query, or the reason it is not one yet. */
export function searchOf(by: CheckBy, text: string): SearchResult {
  const value = text.trim();
  if (value === '') return { error: 'one_of' };
  if (by === 'name') return value.length < REGISTRATION_NAME_MIN ? { error: 'query_too_short' } : { search: { by, q: value } };
  const phone = normalizePhone(value);
  return phone.ok ? { search: { by, phone: phone.e164 } } : { error: 'invalid_phone' };
}

export function checkPath(search: CheckSearch): string {
  const params = search.by === 'phone' ? { phone: search.phone } : { q: search.q };
  return `/sales/registration-check${toQueryString(params)}`;
}

const known = (code: unknown): code is CheckErrorCode =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(t.registrationCheck.error, code);

/** The API's `{ code }` or a `validation_failed` issue in her words; anything else is generic. */
export function checkErrorText(error: unknown): string {
  const body = error instanceof ApiError && typeof error.body === 'object' && error.body !== null ? error.body : {};
  const code: unknown = Reflect.get(body, 'code');
  const issues: unknown = Reflect.get(body, 'issues');
  const issue = Array.isArray(issues)
    ? issues.map((i: unknown) => (typeof i === 'object' && i !== null ? Reflect.get(i, 'message') : undefined)).find(known)
    : undefined;
  const key = known(code) ? code : issue;
  return t.registrationCheck.error[key ?? 'generic'];
}

/** The answer for the submitted search; nothing is fetched until there is one. */
export function useRegistrationCheck(search: CheckSearch | null) {
  return useQuery({
    queryKey: ['sales', 'registration-check', search],
    queryFn: () => apiFetch<RegistrationCheckView>(search ? checkPath(search) : ''),
    enabled: search !== null,
    staleTime: 0,
  });
}

import type { UserReference } from '@ab/shared';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';

// Same mapping as the web (apps/web/src/features/users/errors.ts): the API's `code` → t.users.errors.

const messages = (): Record<string, string | undefined> => t.users.errors;
const tables = (): Record<string, string | undefined> => t.users.tables;

function codeOf(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return null;
  const code: unknown = Reflect.get(error.body, 'code');
  return typeof code === 'string' ? code : null;
}

/** The message of an API error by its `code`; the generic one for anything unknown. */
export function userErrorText(error: unknown): string {
  const code = codeOf(error);
  return (code ? messages()[code] : undefined) ?? t.users.errors.generic;
}

/** The tables holding rows of a user (409 users_has_history), or null for any other error. */
export function historyReferences(error: unknown): UserReference[] | null {
  if (!(error instanceof ApiError) || codeOf(error) !== 'users_has_history') return null;
  const refs: unknown = typeof error.body === 'object' && error.body !== null ? Reflect.get(error.body, 'references') : null;
  return Array.isArray(refs) ? (refs as UserReference[]) : [];
}

/** A table's name in the UI language, or the raw table name when none is written. */
export const tableLabel = (table: string): string => tables()[table] ?? table;

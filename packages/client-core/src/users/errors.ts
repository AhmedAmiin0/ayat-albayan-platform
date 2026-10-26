import type { UserReference } from '@ab/shared';
import { ApiError } from '../http/index.js';

/** The app's `t.users.errors` (with `generic`) and `t.users.tables`. */
export interface UserErrorText {
  errors: Record<string, string | undefined> & { generic: string };
  tables: Record<string, string | undefined>;
}

function codeOf(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return null;
  const code: unknown = Reflect.get(error.body, 'code');
  return typeof code === 'string' ? code : null;
}

/** The API's `code` → the app's words (read on every call, so a language switch applies). */
export function userErrors(text: () => UserErrorText) {
  /** The message of an API error by its `code`; the generic one for anything unknown. */
  function userErrorText(error: unknown): string {
    const code = codeOf(error);
    return (code ? text().errors[code] : undefined) ?? text().errors.generic;
  }

  /** The tables holding rows of a user (409 users_has_history), or null for any other error. */
  function historyReferences(error: unknown): UserReference[] | null {
    if (!(error instanceof ApiError) || codeOf(error) !== 'users_has_history') return null;
    const refs: unknown = typeof error.body === 'object' && error.body !== null ? Reflect.get(error.body, 'references') : null;
    return Array.isArray(refs) ? (refs as UserReference[]) : [];
  }

  /** A table's name in the UI language, or the raw table name when none is written. */
  const tableLabel = (table: string): string => text().tables[table] ?? table;

  return { userErrorText, historyReferences, tableLabel };
}

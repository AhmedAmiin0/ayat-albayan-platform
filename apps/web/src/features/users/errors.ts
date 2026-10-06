import type { UserReference } from '@ab/shared';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';

const MESSAGES: Record<string, string | undefined> = t.users.errors;
const TABLES: Record<string, string | undefined> = t.users.tables;

function codeOf(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return null;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** The message of an API error by its `code`; the generic one for anything unknown. */
export function userErrorText(error: unknown): string {
  const code = codeOf(error);
  return (code ? MESSAGES[code] : undefined) ?? t.users.errors.generic;
}

/** The tables holding rows of a user (409 users_has_history), or null for any other error. */
export function historyReferences(error: unknown): UserReference[] | null {
  if (codeOf(error) !== 'users_has_history') return null;
  const refs = (error as ApiError).body as { references?: unknown };
  return Array.isArray(refs.references) ? (refs.references as UserReference[]) : [];
}

/** A table's name in the UI language, or the raw table name when none is written. */
export const tableLabel = (table: string): string => TABLES[table] ?? table;

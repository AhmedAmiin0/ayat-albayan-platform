import { pushReaderOf, readerMayGet } from '@ab/shared';
import type { AnyPushKind, UserRole } from '@ab/catalog';

interface Reader {
  id: string;
  role: UserRole | null;
}

/** The student logins among `readers`: whose students.contact_is_self PushAudience looks up. */
export const studentLogins = (readers: readonly Reader[]): string[] =>
  readers.filter((r) => r.role === 'student').map((r) => r.id);

/**
 * Only the profiles whose reader may hear about `kind` (push-readers.ts, docs/50 §4): a child
 * student gets the lesson and report kinds, never money; staff are left to their permissions.
 * `adults`: the student logins that are their own contact (they read as a family). Pure.
 */
export function readersOf<P extends Reader>(
  kind: AnyPushKind,
  profiles: readonly P[],
  adults: ReadonlySet<string>,
): P[] {
  return profiles.filter((p) => readerMayGet(pushReaderOf(p.role, adults.has(p.id)), kind));
}

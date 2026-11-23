import type { AnyPushKind, UserRole } from '@ab/catalog';

// What a bell row may be about, by who reads it (docs/50 §2, §4): a child student never sees money.
// PushAudience applies it at send time, after the kind's permissions (PUSH_KIND_PERMISSIONS).

/** Staff; a family (a guardian, or an adult student who is their own contact); a child student. */
export type PushReader = 'staff' | 'family' | 'child';

/** A lesson or its report: what every family reader may hear about. */
const LESSON_PUSH_KINDS = [
  'lesson_starting',
  'lesson_live',
  'report_sent',
  'lesson_request_declined',
  'lesson_rescheduled',
  'lesson_cancelled',
  'course_paused',
  'course_resumed',
] as const satisfies readonly AnyPushKind[];

/** Money news: for the guardian or an adult student, never a child. */
const MONEY_PUSH_KINDS = [
  'payment_due',
  'payment_received',
] as const satisfies readonly AnyPushKind[];

/** The student's chat with the teacher: every family reader, a child too. */
const CHAT_PUSH_KINDS = ['channel_message'] as const satisfies readonly AnyPushKind[];

const among =
  (kinds: readonly AnyPushKind[]) =>
  (kind: AnyPushKind): boolean =>
    kinds.includes(kind);

const READS: Readonly<Record<PushReader, (kind: AnyPushKind) => boolean>> = {
  staff: () => true,
  family: among([...LESSON_PUSH_KINDS, ...MONEY_PUSH_KINDS, ...CHAT_PUSH_KINDS]),
  child: among([...LESSON_PUSH_KINDS, ...CHAT_PUSH_KINDS]),
};

/** A student login reads as family only when it is its own contact (students.contact_is_self). */
const READER_OF: Readonly<Record<UserRole, (contactIsSelf: boolean) => PushReader>> = {
  admin: () => 'staff',
  teacher: () => 'staff',
  assistant: () => 'staff',
  sales: () => 'staff',
  guardian: () => 'family',
  student: (self) => (self ? 'family' : 'child'),
};

/** The reader a profile is; no role (or no student row) reads as a child: the strictest. */
export function pushReaderOf(role: UserRole | null, contactIsSelf: boolean): PushReader {
  return role ? READER_OF[role](contactIsSelf) : 'child';
}

/** May this reader be told about `kind`? Staff: whatever their permissions allow. */
export const readerMayGet = (reader: PushReader, kind: AnyPushKind): boolean => READS[reader](kind);

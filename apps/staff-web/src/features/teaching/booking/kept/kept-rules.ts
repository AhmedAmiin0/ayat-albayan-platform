import { hashKey } from '@tanstack/react-query';
import type { BookSearch } from '@/features/teaching/booking/api';
import { stepsOf, type BookingDraft, type StepKey } from '@/features/teaching/booking/draft/draft';

const ENTRY_FIELDS = [
  'studentId',
  'leadId',
  'pkg',
  'kind',
  'missedLessonId',
  'teacherId',
  'startsAt',
] as const satisfies readonly (keyof BookSearch)[];

/** One draft per entry of /admin/book: a student, a lead and package, a calendar gap, or bare. */
export const keptKey = (search: BookSearch): string =>
  ENTRY_FIELDS.map((field) => search[field] ?? '').join(':');

/** The request id is new on every fresh draft; key order differs once read back from storage. */
const sameDraft = (a: BookingDraft, b: BookingDraft): boolean =>
  hashKey([{ ...a, requestId: '' }]) === hashKey([{ ...b, requestId: '' }]);

interface Progress {
  draft: BookingDraft;
  step: StepKey;
  booked: boolean;
}

/** Not booked yet, and moved from what the entry opened with: worth keeping and guarding. */
export function isUnfinished(fresh: BookingDraft, now: Progress): boolean {
  const moved = now.step !== (stepsOf(fresh)[0] ?? 'students') || !sameDraft(fresh, now.draft);
  return !now.booked && moved;
}

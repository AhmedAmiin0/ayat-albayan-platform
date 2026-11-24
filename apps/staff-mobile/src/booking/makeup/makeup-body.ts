import type { BookingRequest } from '@ab/shared';
import { toInvoiceInput } from '@/booking/trial/lib/booking-body';
import type { MakeupDraft } from './makeup-draft';
import { ruleFromSlot } from '@/booking/shared/slots';

/** One lesson linked to the missed one; one-lesson rule like a trial; 400 without the invoice. */
export function makeupRequest(d: MakeupDraft, requestId: string): BookingRequest | null {
  if (!d.startsAt) return null;
  const { source } = d;
  const rule = ruleFromSlot(d.startsAt, source.tz);
  return {
    kind: 'makeup',
    studentIds: [source.studentId],
    makeupOfLessonId: source.lessonId,
    teacherId: d.teacher.id,
    byday: [rule.weekday],
    startTimeLocal: rule.startTimeLocal,
    tz: source.tz,
    durationMin: source.durationMin,
    startsOn: rule.startsOn,
    startsAt: d.startsAt,
    clientRequestId: requestId,
    ...(d.invoice ? { invoice: toInvoiceInput(d.invoice) } : {}),
  };
}

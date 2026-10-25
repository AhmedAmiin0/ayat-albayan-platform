import { toInvoiceInput } from '../trial/lib/booking-body';
import type { MakeupRequest } from '../shared/contract';
import type { MakeupDraft } from './makeup-draft';
import { ruleFromSlot } from '../shared/slots';

/**
 * POST /booking for «حجز تعويضي»: one lesson of the missed lesson's student, linked to it. No
 * package, lead or new child; one-lesson rule like a trial (its weekday, ending that day). The
 * invoice rides along (the API answers 400 invoice_required without it).
 */
export function makeupRequest(d: MakeupDraft, requestId: string): MakeupRequest | null {
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

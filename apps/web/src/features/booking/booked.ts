import { normalizePhone, type BookingResult } from '@ab/shared';
import type { BookingDraft, PickedStudent } from './draft';

// What the booked panel offers next (R-SUB-01): the subscription for a regular package, and the way
// back to the chat the lead came from.

/**
 * Who «اعمل الاشتراك» is for: the booked student (the lead's new one, or the first picked); null
 * after a trial. ponytail: one student; siblings booked together subscribe from their profiles.
 */
export function subscribeTarget(d: BookingDraft, r: BookingResult): PickedStudent | null {
  const id = r.student_ids[0];
  if (d.pkg === 'trial' || !id) return null;
  return d.students.find((s) => s.id === id) ?? { id, name: d.newStudent?.name.trim() ?? '', code: null };
}

/** The lead's WhatsApp number (E.164) for «ارجع للمحادثة»; null when not booked from a lead. */
export function chatPhone(d: Pick<BookingDraft, 'leadId' | 'newStudent'>): string | null {
  if (!d.leadId || !d.newStudent) return null;
  const phone = normalizePhone(d.newStudent.guardianPhone);
  return phone.ok ? phone.e164 : null;
}

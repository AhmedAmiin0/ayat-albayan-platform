import { bookingKindOf, type BookingRequest } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { forbidden } from '../scheduling/errors';
import type { SalesOwnership } from '../sales/sales-ownership';

const all = (ids: readonly string[], allowed: readonly string[]): boolean => ids.every((id) => allowed.includes(id));

/**
 * What an assistant (base role sales) may book (R-ASST-01): a free TRIAL for their own leads' families and their
 * own students. Never a package or a makeup (they carry a price and an invoice: the admin's), never over a clash
 * (the override is the admin's, R-SCH-04), never a custom meeting link or an invoice. A new guardian must be the
 * family of one of their leads (its phone is one of theirs): otherwise any phone could be typed in to attach an
 * existing family, and the student brought, to read its chat. 403 with the code: override_not_allowed,
 * kind_not_allowed, meeting_link_not_allowed, invoice_not_allowed, not_your_lead, not_your_student, not_your_family.
 */
export function assertBookingScope(req: BookingRequest, own: SalesOwnership): void {
  if (req.override) throw forbidden('override_not_allowed');
  if (bookingKindOf(req) !== 'trial') throw forbidden('kind_not_allowed');
  if (req.meetingLink) throw forbidden('meeting_link_not_allowed');
  if (req.invoice) throw forbidden('invoice_not_allowed');
  if (req.leadId && !own.leadIds.includes(req.leadId)) throw forbidden('not_your_lead');
  if ('studentIds' in req) {
    if (!all(req.studentIds, own.studentIds)) throw forbidden('not_your_student');
    return;
  }
  if (!own.phones.includes(req.guardian.phone_e164)) throw forbidden('not_your_family');
}

/** The teachers list and the slots grid name a student only when it is theirs. */
export function assertOwnStudents(ids: readonly string[], own: SalesOwnership): void {
  if (!all(ids, own.studentIds)) throw forbidden('not_your_student');
}

type Candidate = { id: string; name: string };
const isCandidates = (v: unknown): v is Candidate[] =>
  Array.isArray(v) && v.every((c) => typeof c === 'object' && c !== null && typeof c.id === 'string' && typeof c.name === 'string');

/**
 * 409 duplicate_student names the guardian's children; an assistant is told only about her own (id, name),
 * as the inbox shows her only the children she brought (salesPeople). Any other error passes through.
 */
export function scopeDuplicates(e: Error, own: SalesOwnership): Error {
  if (!(e instanceof HttpException) || e.getStatus() !== 409) return e;
  const body = e.getResponse();
  if (typeof body !== 'object' || body === null || !('code' in body) || body.code !== 'duplicate_student') return e;
  const raw = 'candidates' in body ? body.candidates : [];
  const candidates = (isCandidates(raw) ? raw : []).filter((c) => own.studentIds.includes(c.id)).map(({ id, name }) => ({ id, name }));
  return new HttpException({ code: 'duplicate_student', message: 'duplicate_student', candidates }, 409);
}

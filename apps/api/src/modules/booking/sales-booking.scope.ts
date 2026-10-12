import { bookingKindOf, type BookingRequest } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { forbidden } from '../scheduling/errors';
import type { SalesOwnership } from '../sales/sales-ownership';

const all = (ids: readonly string[], allowed: readonly string[]): boolean => ids.every((id) => allowed.includes(id));

/**
 * What /sales/booking checks ownership against (SalesBookingScope): her leads, families and students while
 * settings.sales_auto_assign is ON; null while it is OFF = no ownership check at all (owner 2026-10-12, docs/16
 * row 13). null is NOT NO_OWNERSHIP (owns nothing): never write `own ?? NO_OWNERSHIP`, it would block everyone.
 */
export type BookingOwnership = SalesOwnership | null;

/**
 * What an assistant (base role sales) may book (R-ASST-01): a free TRIAL only. Never a package or a makeup (they
 * carry a price and an invoice: the admin's), never over a clash (the override is the admin's, R-SCH-04), never a
 * custom meeting link or an invoice: these four always hold. While ownership is checked (own not null), only for
 * her own leads' families and her own students, and a new guardian must be the family of one of her leads (its
 * phone is one of hers): otherwise any phone could be typed in to attach an existing family. 403 with the code:
 * override_not_allowed, kind_not_allowed, meeting_link_not_allowed, invoice_not_allowed, then (ON only)
 * not_your_lead, not_your_student, not_your_family.
 */
export function assertBookingScope(req: BookingRequest, own: BookingOwnership): void {
  if (req.override) throw forbidden('override_not_allowed');
  if (bookingKindOf(req) !== 'trial') throw forbidden('kind_not_allowed');
  if (req.meetingLink) throw forbidden('meeting_link_not_allowed');
  if (req.invoice) throw forbidden('invoice_not_allowed');
  if (!own) return; // sales_auto_assign OFF: any lead, family or student
  if (req.leadId && !own.leadIds.includes(req.leadId)) throw forbidden('not_your_lead');
  if ('studentIds' in req) {
    if (!all(req.studentIds, own.studentIds)) throw forbidden('not_your_student');
    return;
  }
  if (!own.phones.includes(req.guardian.phone_e164)) throw forbidden('not_your_family');
}

/** The teachers list and the slots grid name a student only when it is hers (any student while own is null). */
export function assertOwnStudents(ids: readonly string[], own: BookingOwnership): void {
  if (own && !all(ids, own.studentIds)) throw forbidden('not_your_student');
}

type Candidate = { id: string; name: string };
const isCandidates = (v: unknown): v is Candidate[] =>
  Array.isArray(v) && v.every((c) => typeof c === 'object' && c !== null && typeof c.id === 'string' && typeof c.name === 'string');

/**
 * 409 duplicate_student names the guardian's children, as id and name only (never notes or the guardian id).
 * While ownership is checked only her own children are listed (she could not book the others: not_your_student);
 * with own = null every child, which the chat's people panel shows her anyway (docs/16 decision 1, salesPeople).
 * Any other error passes through.
 */
export function scopeDuplicates(e: Error, own: BookingOwnership): Error {
  if (!(e instanceof HttpException) || e.getStatus() !== 409) return e;
  const body = e.getResponse();
  if (typeof body !== 'object' || body === null || !('code' in body) || body.code !== 'duplicate_student') return e;
  const raw = 'candidates' in body ? body.candidates : [];
  const mine = (c: Candidate): boolean => !own || own.studentIds.includes(c.id);
  const candidates = (isCandidates(raw) ? raw : []).filter(mine).map(({ id, name }) => ({ id, name }));
  return new HttpException({ code: 'duplicate_student', message: 'duplicate_student', candidates }, 409);
}

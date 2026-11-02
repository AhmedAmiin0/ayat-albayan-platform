import { bookingKindOf, type BookingKind, type BookingRequest } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { forbidden } from '@/common/http/errors';
import type { SalesOwnership } from '@/modules/sales/sales';

const all = (ids: readonly string[], allowed: readonly string[]): boolean =>
  ids.every((id) => allowed.includes(id));

type StudentsRequest = Extract<BookingRequest, { studentIds: unknown }>;
/** Booked for existing students (no new family). */
const forStudents = (req: BookingRequest): req is StudentsRequest => 'studentIds' in req;

/** A 403 code and when it applies; the first rule that holds wins. */
type Rule<T> = readonly [code: string, holds: (input: T) => boolean];

function refuse<T>(rules: readonly Rule<T>[], input: T): void {
  const hit = rules.find(([, holds]) => holds(input));
  if (hit) throw forbidden(hit[0]);
}

/**
 * What /sales/booking checks ownership against (SalesBookingScope): her leads, families and students while
 * settings.sales_auto_assign is ON; null while it is OFF = no ownership check at all (owner 2026-10-12, docs/16
 * row 13). null is NOT NO_OWNERSHIP (owns nothing): never write `own ?? NO_OWNERSHIP`, it would block everyone.
 */
export type BookingOwnership = SalesOwnership | null;

/** A course: false = none (kind_not_allowed), true = hers (self.sales_money), 'any' = ANY student. */
export type CourseGrant = boolean | 'any';

/**
 * What an assistant (base role sales) may book (R-ASST-01): a free TRIAL, and with self.sales_money (`canCourse`)
 * the weekly course of a subscription she sold (owner 2026-10-18: kind 'package', no invoice: the money is the
 * subscription's). Never a makeup, never over a clash (the override is the admin's, R-SCH-04), never a custom
 * meeting link or an invoice: these always hold. A course is one existing student of HERS, whatever
 * sales_auto_assign says (own is then always read, SalesBookingScope.forRequest). A trial is checked only while
 * ownership is (own not null): her own leads' families and her own students, and a new guardian must be the family
 * of one of her leads (its phone is one of hers): otherwise any phone could be typed in to attach an existing
 * family. 403 with the code: override_not_allowed, kind_not_allowed, meeting_link_not_allowed, invoice_not_allowed,
 * then course_one_student / not_your_student (a course), or (ON only) not_your_lead, not_your_student, not_your_family.
 * canCourse 'any' (sales.renew_any, owner 2026-11-01, docs/16 row 38): a course of ANY one student.
 */
export function assertBookingScope(req: BookingRequest, own: BookingOwnership, canCourse: CourseGrant = false): void {
  const kind = bookingKindOf(req);
  refuse(ALWAYS_REFUSED, { req, kind, canCourse });
  KIND_SCOPE[kind](req, own, canCourse);
}

interface Asked {
  req: BookingRequest;
  kind: BookingKind;
  canCourse: CourseGrant;
}

/** What an assistant never books, in this order. */
const ALWAYS_REFUSED: readonly Rule<Asked>[] = [
  ['override_not_allowed', ({ req }) => !!req.override],
  ['kind_not_allowed', (a) => a.kind === 'makeup' || (a.kind === 'package' && !a.canCourse)],
  ['meeting_link_not_allowed', ({ req }) => !!req.meetingLink],
  ['invoice_not_allowed', ({ req }) => !!req.invoice],
];

/**
 * A course: exactly one existing student (no lead, no new family), one of hers (null owns nothing
 * here), or any with the grant 'any' (sales.renew_any).
 */
function assertCourse(req: BookingRequest, own: BookingOwnership, grant: CourseGrant): void {
  if (!forStudents(req) || req.studentIds.length !== 1 || req.leadId) throw forbidden('course_one_student');
  if (grant === 'any') return;
  if (!own || !all(req.studentIds, own.studentIds)) throw forbidden('not_your_student');
}

interface Owned {
  req: BookingRequest;
  own: SalesOwnership;
}

const phoneOf = (req: Exclude<BookingRequest, StudentsRequest>): string => req.guardian.phone_e164;

/** Her lead, her students, or a new family whose phone is one of hers, in this order. */
const NOT_OWNED: readonly Rule<Owned>[] = [
  ['not_your_lead', ({ req, own }) => !!req.leadId && !own.leadIds.includes(req.leadId)],
  ['not_your_student', ({ req, own }) => forStudents(req) && !all(req.studentIds, own.studentIds)],
  ['not_your_family', ({ req, own }) => !forStudents(req) && !own.phones.includes(phoneOf(req))],
];

/** A trial: checked only while ownership is (null = sales_auto_assign OFF: no check at all). */
function assertTrial(req: BookingRequest, own: BookingOwnership): void {
  if (own) refuse(NOT_OWNED, { req, own });
}

type KindScope = (req: BookingRequest, own: BookingOwnership, grant: CourseGrant) => void;

/** Per kind, the ownership check after ALWAYS_REFUSED (a makeup never gets here). */
const KIND_SCOPE = {
  package: assertCourse,
  trial: assertTrial,
  makeup: assertTrial,
} satisfies Record<BookingKind, KindScope>;

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

import { bookingRequestSchema, type BookingRequest } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { SalesOwnership } from '../sales/sales-ownership';
import { assertBookingScope, assertOwnStudents, scopeDuplicates } from './sales-booking.scope';

const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const LEAD = 'b0000000-0000-4000-8000-000000000001';
const OTHER_LEAD = 'b0000000-0000-4000-8000-000000000002';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const OWN: SalesOwnership = { leadIds: [LEAD], guardianIds: ['g1'], studentIds: [S1], phones: ['+966551110000', '+966552220000'] };
const RULE = { teacherId: TEACHER, byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-11' };

const existing = (over: object = {}): BookingRequest => bookingRequestSchema.parse({ ...RULE, package: 'trial', studentIds: [S1], ...over });
const fresh = (over: object = {}): BookingRequest =>
  bookingRequestSchema.parse({
    ...RULE, package: 'trial', leadId: LEAD, newStudent: { name: 'ياسمين', tz: 'Asia/Riyadh' },
    guardian: { name: 'أم ياسمين', phone_e164: '+966551110000', tz: 'Asia/Riyadh' }, ...over,
  });
const code = (fn: () => void): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof HttpException ? (e.getResponse() as { code: string }).code : 'other';
  }
};

describe('assertBookingScope: what an assistant may book', () => {
  it('a trial for a new family of her own lead (its phone is hers) and for her own students passes', () => {
    expect(code(() => assertBookingScope(fresh(), OWN))).toBeNull();
    expect(code(() => assertBookingScope(existing(), OWN))).toBeNull();
    expect(code(() => assertBookingScope(existing({ leadId: LEAD }), OWN))).toBeNull();
    expect(code(() => assertBookingScope(existing({ kind: 'trial' }), OWN))).toBeNull();
  });

  it('only a trial: a package (any size, either shape) carries a price and an invoice and is the admin', () => {
    expect(code(() => assertBookingScope(existing({ package: '8', leadId: LEAD }), OWN))).toBe('kind_not_allowed');
    expect(code(() => assertBookingScope(existing({ package: '12' }), OWN))).toBe('kind_not_allowed');
    expect(code(() => assertBookingScope(fresh({ package: '8' }), OWN))).toBe('kind_not_allowed');
  });

  it('no custom meeting link and no invoice, even on a trial', () => {
    expect(code(() => assertBookingScope(existing({ meetingLink: 'https://meet.example/own-room' }), OWN))).toBe('meeting_link_not_allowed');
    expect(code(() => assertBookingScope(fresh({ meetingLink: 'https://meet.example/own-room' }), OWN))).toBe('meeting_link_not_allowed');
    expect(code(() => assertBookingScope(existing({ invoice: { source: 'upload', path: 'invoices/x.pdf' } }), OWN))).toBe('invoice_not_allowed');
    expect(code(() => assertBookingScope(existing({ meetingLink: null }), OWN))).toBeNull();
  });

  it('another assistant lead is not_your_lead, in both shapes', () => {
    expect(code(() => assertBookingScope(fresh({ leadId: OTHER_LEAD }), OWN))).toBe('not_your_lead');
    expect(code(() => assertBookingScope(existing({ leadId: OTHER_LEAD }), OWN))).toBe('not_your_lead');
  });

  it('a student that is not hers (even with hers in the list) is not_your_student', () => {
    expect(code(() => assertBookingScope(existing({ studentIds: [S2] }), OWN))).toBe('not_your_student');
    expect(code(() => assertBookingScope(existing({ studentIds: [S1, S2] }), OWN))).toBe('not_your_student');
  });

  it('a guardian phone that is not one of hers is not_your_family: no attaching, probing or hijacking a family by typing its phone', () => {
    const stranger = { name: 'غريبة', phone_e164: '+966559999999', tz: 'Asia/Riyadh' };
    expect(code(() => assertBookingScope(fresh({ guardian: stranger }), OWN))).toBe('not_your_family');
  });

  it('never over a clash (the override is the admin) and never a makeup', () => {
    expect(code(() => assertBookingScope(existing({ override: { reason: 'سبب' } }), OWN))).toBe('override_not_allowed');
    expect(code(() => assertBookingScope(fresh({ override: { reason: 'سبب' } }), OWN))).toBe('override_not_allowed');
    const makeup = existing({ package: undefined, kind: 'makeup', makeupOfLessonId: 'd0000000-0000-4000-8000-000000000001' });
    expect(code(() => assertBookingScope(makeup, OWN))).toBe('kind_not_allowed');
  });

  it('nothing owned: every shape is refused', () => {
    const none: SalesOwnership = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
    expect(code(() => assertBookingScope(fresh(), none))).toBe('not_your_lead');
    expect(code(() => assertBookingScope(existing(), none))).toBe('not_your_student');
  });
});

describe('assertOwnStudents', () => {
  it('only hers', () => {
    expect(code(() => assertOwnStudents([S1], OWN))).toBeNull();
    expect(code(() => assertOwnStudents([], OWN))).toBeNull();
    expect(code(() => assertOwnStudents([S1, S2], OWN))).toBe('not_your_student');
  });
});

describe('scopeDuplicates: the duplicate_student 409 names only her own children, as id and name', () => {
  const dup = (candidates: unknown) => new HttpException({ code: 'duplicate_student', message: 'duplicate_student', guardian_id: 'g1', candidates }, 409);

  it('filters the candidates to hers and drops every other field, the guardian id included', () => {
    const out = scopeDuplicates(dup([{ id: S1, name: 'ياسمين', notes: 'سر' }, { id: S2, name: 'ياسمينة', notes: 'سر' }]), OWN);
    expect(out).toBeInstanceOf(HttpException);
    expect((out as HttpException).getStatus()).toBe(409);
    expect((out as HttpException).getResponse()).toEqual({ code: 'duplicate_student', message: 'duplicate_student', candidates: [{ id: S1, name: 'ياسمين' }] });
  });

  it('a malformed candidates list reads empty; other errors pass through untouched', () => {
    expect((scopeDuplicates(dup('x'), OWN) as HttpException).getResponse()).toMatchObject({ candidates: [] });
    const conflict = new HttpException({ code: 'conflict', conflicts: [] }, 409);
    const notFound = new HttpException({ code: 'duplicate_student' }, 404);
    const plain = new Error('boom');
    expect(scopeDuplicates(conflict, OWN)).toBe(conflict);
    expect(scopeDuplicates(notFound, OWN)).toBe(notFound);
    expect(scopeDuplicates(plain, OWN)).toBe(plain);
  });
});

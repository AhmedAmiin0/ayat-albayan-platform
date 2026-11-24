import type { BookingRequest } from '@ab/shared';
import type { BookingMode } from '@ab/client-core';
import { courseDraftSavedSchema } from '@ab/shared';
import { PACKAGE_SIZES, type Gender, type PackageSize, type Program } from '@ab/catalog';
import type { BookingResult, BookingTeacherOption, Conflict } from '@ab/schedule';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import { BOOKING_KINDS, type BookingKind } from './draft/contract';
import { bookingBase } from './mode';

// Booking routes (docs/10 §5, rows 12–14) + the guardian row for the quote currency.

/** GET /booking/teachers?program&gender — active teachers by name, with load and availability. */
export const bookingTeachersQuery = (f: { program: Program; gender: Gender | null }, mode: BookingMode = 'admin') => {
  const params = new URLSearchParams({ program: f.program });
  if (f.gender) params.set('gender', f.gender);
  return queryOptions({
    queryKey: ['booking', mode, 'teachers', params.toString()],
    queryFn: () => apiFetch<BookingTeacherOption[]>(`${bookingBase(mode)}/teachers?${params}`),
  });
};

export type GuardianRow = { id: string; name: string; phone_e164: string; country: string | null; tz: string };

/** GET /guardians/:id — the stored country picks the price currency (docs/08 §1). */
export const guardianQuery = (id: string) =>
  queryOptions({
    queryKey: ['guardians', id],
    queryFn: () => apiFetch<GuardianRow>(`/guardians/${id}`),
  });

/** apiSend with its reply left unknown, for the schema to parse. */
const put: (method: 'PUT', path: string, body: unknown) => Promise<unknown> = apiSend;

/** PUT /sales/booking/course/draft (owner 2026-11-06): null = kept until the payment. */
async function saveCourseDraft(body: BookingRequest): Promise<BookingResult | null> {
  const saved = courseDraftSavedSchema.parse(await put('PUT', '/sales/booking/course/draft', body));
  return saved.state === 'booked' ? saved.booking : null;
}

/**
 * POST /booking: one transaction (rule + lessons + queued confirmations). 409 = conflicts. A held
 * course (`hold`) is saved as a draft instead: null.
 */
export const createBooking = (body: BookingRequest, mode: BookingMode = 'admin', hold = false) =>
  hold ? saveCourseDraft(body) : apiSend<BookingResult>('POST', bookingBase(mode), body);

/** Whole-series clashes (R-SCH-04) incl. after DST; keyed without idempotency key and invoice. */
export const bookingCheckQuery = (body: BookingRequest, mode: BookingMode = 'admin') => {
  const key: Partial<BookingRequest> = { ...body };
  delete key.clientRequestId;
  delete key.invoice; // the check never needs the proof
  delete key.meetingLink; // nor the link: typing it never re-checks
  return queryOptions({
    queryKey: ['booking', mode, 'check', JSON.stringify(key)],
    queryFn: () => apiSend<{ conflicts: Conflict[] }>('POST', `${bookingBase(mode)}/check`, body),
    retry: false,
  });
};

/** `pkg` none is a trial (R-SUB-01); `teacherId` + `startsAt` preselect a gap; makeup R-SCH-10. */
export type BookSearch = {
  studentId?: string;
  leadId?: string;
  phone?: string;
  name?: string;
  pkg?: PackageSize;
  teacherId?: string;
  startsAt?: string;
  kind?: BookingKind;
  missedLessonId?: string;
};

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseBookSearch(s: Record<string, unknown>): BookSearch {
  const out: BookSearch = { ...hintOf(s) };
  const studentId = text(s['studentId']);
  const leadId = text(s['leadId']);
  if (studentId) {
    out.studentId = studentId;
    const kind = BOOKING_KINDS.find((k) => k === s['kind']);
    const missed = text(s['missedLessonId']);
    if (kind) out.kind = kind;
    if (kind === 'makeup' && missed && UUID.test(missed)) out.missedLessonId = missed;
  } else if (leadId) {
    out.leadId = leadId;
    const phone = text(s['phone']);
    const name = text(s['name']);
    const pkg = PACKAGE_SIZES.find((p) => p === String(s['pkg']));
    if (phone) out.phone = phone;
    if (name) out.name = name;
    if (pkg) out.pkg = pkg;
  }
  return out;
}

/** The calendar's free-gap hint: a teacher uuid, and its start (an instant) only with it. */
function hintOf(s: Record<string, unknown>): Pick<BookSearch, 'teacherId' | 'startsAt'> {
  const teacherId = text(s['teacherId']);
  if (!teacherId || !UUID.test(teacherId)) return {};
  const at = Date.parse(text(s['startsAt']) ?? '');
  return Number.isNaN(at) ? { teacherId } : { teacherId, startsAt: new Date(at).toISOString() };
}

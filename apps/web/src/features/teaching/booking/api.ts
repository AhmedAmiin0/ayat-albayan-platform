import {
  PACKAGE_SIZES,
  type BookingResult,
  type BookingTeacherOption,
  type Conflict,
  type Gender,
  type PackageSize,
  type Program,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { BOOKING_KINDS, type BookingBody, type BookingKind } from './draft/contract';
import { bookingBase, type BookingMode } from './mode';

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

/** POST /booking: one transaction (rule + lessons + queued confirmations). 409 = conflicts. */
export const createBooking = (body: BookingBody, mode: BookingMode = 'admin') =>
  apiSend<BookingResult>('POST', bookingBase(mode), body);

/**
 * POST /booking/check — the whole series' clashes for the slot step, before «احجز» (R-SCH-04),
 * including the weeks after a coming DST change. Keyed by the body minus its idempotency key,
 * invoice and meeting link.
 */
export const bookingCheckQuery = (body: BookingBody, mode: BookingMode = 'admin') => {
  const key: Partial<BookingBody> = { ...body };
  delete key.clientRequestId;
  delete key.invoice; // the check never needs the proof
  delete key.meetingLink; // nor the link: typing it never re-checks
  return queryOptions({
    queryKey: ['booking', mode, 'check', JSON.stringify(key)],
    queryFn: () => apiSend<{ conflicts: Conflict[] }>('POST', `${bookingBase(mode)}/check`, body),
    retry: false,
  });
};

/**
 * /admin/book URL state: from a student profile, or from a lead row (R-LEAD-06). `pkg` = the
 * lead's package: none = a trial, a size = «اشترك» from the chat (R-SUB-01). `teacherId` +
 * `startsAt` = a free gap on the calendar: the wizard preselects that teacher and start.
 * `kind` + `missedLessonId` = «حجز تعويضي» from a missed lesson's drawer (R-SCH-10).
 */
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

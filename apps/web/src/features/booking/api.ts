import type { BookingRequest, BookingResult, BookingTeacherOption, Gender, Program } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

// Booking routes (docs/10 §5, rows 12–14) + the guardian row for the quote currency.

/** GET /booking/teachers?program&gender — active teachers by name, with load and availability. */
export const bookingTeachersQuery = (f: { program: Program; gender: Gender | null }) => {
  const params = new URLSearchParams({ program: f.program });
  if (f.gender) params.set('gender', f.gender);
  return queryOptions({
    queryKey: ['booking', 'teachers', params.toString()],
    queryFn: () => apiFetch<BookingTeacherOption[]>(`/booking/teachers?${params}`),
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
export const createBooking = (body: BookingRequest) => apiSend<BookingResult>('POST', '/booking', body);

/** /admin/book URL state: from a student profile, or from a lead row (R-LEAD-06). */
export type BookSearch = { studentId?: string; leadId?: string; phone?: string; name?: string };

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function parseBookSearch(s: Record<string, unknown>): BookSearch {
  const out: BookSearch = {};
  const studentId = text(s['studentId']);
  const leadId = text(s['leadId']);
  if (studentId) out.studentId = studentId;
  else if (leadId) {
    out.leadId = leadId;
    const phone = text(s['phone']);
    const name = text(s['name']);
    if (phone) out.phone = phone;
    if (name) out.name = name;
  }
  return out;
}

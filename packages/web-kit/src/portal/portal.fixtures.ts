// Test fixtures for the family portal (test-only). Example data only.
import type {
  PortalHistoryRow,
  PortalHome,
  PortalLesson,
  PortalPackageView,
  PortalStudent,
} from '@ab/shared';

export const kid = (over: Partial<PortalStudent> = {}): PortalStudent => ({
  id: 's1', code: 'AB-0201', name: 'سلمى', tz: 'Africa/Cairo', contact_is_self: false, ...over,
});

export const home = (over: Partial<PortalHome> = {}): PortalHome => ({
  kind: 'guardian',
  students: [kid(), kid({ id: 's2', code: 'AB-0202', name: 'يوسف' })],
  renew_url: 'https://wa.me/966500000000',
  ...over,
});

export const lesson = (over: Partial<PortalLesson> = {}): PortalLesson => ({
  id: 'l1', starts_at: '2026-10-27T16:00:00.000Z', ends_at: '2026-10-27T16:30:00.000Z', status: 'confirmed',
  teacher: { display_name_ar: 'أبرار', display_name_en: null }, way_in: 'classroom', meeting_url: null,
  window: { state: 'open', opens_at: '2026-10-27T15:50:00.000Z', closes_at: '2026-10-27T16:45:00.000Z' },
  ...over,
});

const inMinutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

/** A lesson starting in 5 minutes on the real clock: its window is open now. */
export const soonLesson = (over: Partial<PortalLesson> = {}): PortalLesson =>
  lesson({
    starts_at: inMinutes(5), ends_at: inMinutes(35),
    window: { state: 'open', opens_at: inMinutes(-5), closes_at: inMinutes(50) },
    ...over,
  });

export const historyRow = (over: Partial<PortalHistoryRow> = {}): PortalHistoryRow => ({
  lesson_id: 'h1', starts_at: '2026-10-20T16:00:00.000Z', ends_at: '2026-10-20T16:30:00.000Z',
  teacher: { display_name_ar: 'أبرار', display_name_en: null }, outcome: 'attended',
  absence_reason: null, report_id: 'r1', recording_id: null, ...over,
});

export const packageView = (over: Partial<PortalPackageView> = {}): PortalPackageView => ({
  package: {
    package: '12', duration: 30, lessons_total: 12, lessons_used: 8, remaining: 4,
    starts_on: '2026-10-01', renews_on: '2026-11-01', status: 'active',
    amount_due: { amount: 150, currency: 'SAR' },
  },
  payments: [{ paid_at: '2026-10-01', amount: 300, currency: 'SAR', kind: 'payment' }],
  payment_instructions: 'تحويل بنكي إلى الحساب 0000',
  ...over,
});

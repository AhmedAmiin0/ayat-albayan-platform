// «الجدول» rows of «تفاصيل الطالب» as the database could return them, secrets present (test-only, *.fakes.ts).
import type { SalesScheduleRow } from '../sales';
import type { WeeklyRuleRow } from '@/modules/sales/sales';

/** An imported-style weekly rule (Sun, Tue, Thu 19:00 Riyadh) carrying a link the payload must never show. */
export const ruleRow = (): WeeklyRuleRow & { meeting_link: string } => ({
  id: 'r1', byday: [4, 0, 2], start_time_local: '19:00:00', tz: 'Asia/Riyadh', duration_min: 45, package: '12',
  starts_on: '2026-01-01', ends_on: null, status: 'active', teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar' }, meeting_link: 'https://meet/secret',
});

/** A lesson of `student` a year ahead (always «قادمة»), with its link. */
export const upcomingRow = (student: string): SalesScheduleRow => ({
  id: 'u1', starts_at: '2099-01-04T16:00:00+00:00', ends_at: '2099-01-04T16:45:00+00:00', status: 'scheduled', makeup_of_id: null,
  meeting_link: 'https://meet/secret', rule: { package: 'trial' },
  teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: null, tz: 'Africa/Cairo', meeting_mode: 'link' },
  lesson_students: [{ student: { id: student, code: 'AB-0101', name: 'ياسمين', tz: 'Africa/Cairo' } }],
});

import type { FamilyRequestView } from '@ab/schedule';
import { requestAsked, requestChange, requestMinutes, requestWho } from './request-text';

const R = {
  id: 'p1',
  lesson_id: 'l1',
  starts_at: '2026-11-17T16:30:00.000Z',
  ends_at: '2026-11-17T17:15:00.000Z',
  status: 'scheduled',
  proposed_starts_at: '2026-11-18T15:30:00.000Z',
  note: null,
  created_at: 'c',
  teacher: { id: 't1', display_name_ar: 'فاطمة', display_name_en: null, tz: 'Africa/Cairo' },
  students: [{ id: 's1', code: 'AB-0147', name: 'يوسف أحمد', tz: 'Africa/Cairo' }],
} satisfies FamilyRequestView;
const RIYADH = { tz: 'Asia/Riyadh', cycle: '24' } as const;

test('who, from ← to on the viewer clock, the length', () => {
  expect(requestWho(R)).toBe('يوسف أحمد AB-0147');
  expect(requestChange(R, RIYADH)).toBe('الثلاثاء 17 نوفمبر 19:30 ← الأربعاء 18 نوفمبر 18:30');
  expect(requestMinutes(R)).toBe(45);
});

test("the ask names the student's own clock when it differs", () => {
  expect(requestAsked(R, RIYADH)).toContain('بتوقيت القاهرة');
});

import type { LessonView } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { familyRequests } from '@/modules/teaching/lessons/family-requests/family-request.mapper';

const lesson = (requested_by?: 'family' | 'teacher') =>
  ({
    id: 'l1',
    starts_at: '2026-11-17T15:30:00.000Z',
    ends_at: '2026-11-17T16:15:00.000Z',
    status: 'scheduled',
    teacher: { id: 't1', display_name_ar: 'فاطمة', display_name_en: null, tz: 'Africa/Cairo', extra: 1 },
    students: [{ id: 's1', code: 'AB-0147', name: 'يوسف', tz: 'Africa/Cairo', chargeable: true }],
    pending_proposal: requested_by
      ? { id: 'p1', proposed_starts_at: '2026-11-18T15:30:00.000Z', note: 'اختبار', created_at: 'c', requested_by }
      : null,
  }) as unknown as LessonView;

describe('«طلبات الأسر» rows (owner 2026-11-17)', () => {
  it("a family request becomes a whitelisted row; a teacher's proposal or none is left out", () => {
    expect(familyRequests([lesson('family'), lesson('teacher'), lesson()])).toEqual([
      {
        id: 'p1',
        lesson_id: 'l1',
        starts_at: '2026-11-17T15:30:00.000Z',
        ends_at: '2026-11-17T16:15:00.000Z',
        status: 'scheduled',
        proposed_starts_at: '2026-11-18T15:30:00.000Z',
        note: 'اختبار',
        created_at: 'c',
        teacher: { id: 't1', display_name_ar: 'فاطمة', display_name_en: null, tz: 'Africa/Cairo' },
        students: [{ id: 's1', code: 'AB-0147', name: 'يوسف', tz: 'Africa/Cairo' }],
      },
    ]);
  });
});

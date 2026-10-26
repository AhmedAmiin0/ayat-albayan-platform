import type { LessonStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { dropReason } from './send-stale';

// «موعد تجريبي جديد» (owner 2026-10-25): the moved trial keeps its row as `rescheduled`; whatever was
// queued for it (the guardian's confirmation, the reminders, the teacher's new-student alert) is
// dropped at send time, while the new lesson's own confirmation goes out.

const NOW = new Date('2026-10-25T08:00:00Z');
const OLD_START = '2026-10-26T15:00:00Z';
const queued = (template_key: string, status: LessonStatus) => ({
  template_key,
  dedup_key: `${template_key}:l1:g1`,
  lesson_id: 'l1',
  lead_id: null,
  lead: null,
  expires_at: template_key === 'teacher_new_student' ? OLD_START : null,
  lesson: { status, starts_at: OLD_START },
});

describe('the moved trial’s queued messages', () => {
  it('confirmation and reminders of the rescheduled trial → stale', () => {
    for (const key of ['booking_confirmation', 'booking_confirmation_plain', 'lesson_reminder', 'lesson_reminder_24h', 'teacher_lesson_reminder'])
      expect([key, dropReason(queued(key, 'rescheduled'), NOW)]).toEqual([key, { code: 'stale', text: 'lesson rescheduled' }]);
  });

  it('the old teacher’s new-student alert → stale (the new lesson has its own)', () => {
    expect(dropReason(queued('teacher_new_student', 'rescheduled'), NOW)).toEqual({ code: 'stale', text: 'lesson retimed' });
    expect(dropReason(queued('teacher_new_student', 'cancelled_by_admin'), NOW)?.code).toBe('stale');
  });

  it('the new lesson’s confirmation and alert still go out', () => {
    expect(dropReason(queued('booking_confirmation', 'scheduled'), NOW)).toBeNull();
    expect(dropReason(queued('teacher_new_student', 'scheduled'), NOW)).toBeNull();
  });
});

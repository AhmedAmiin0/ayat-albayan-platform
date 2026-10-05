import type { LessonStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lessonAt } from '@/features/dashboard/today-fixture';
import { t } from '@/lib/i18n';
import { groupOf, groupSessions, sessionChip } from './sessions';

const NOW = new Date('2026-10-05T10:00:00.000Z');
const at = (id: string, startsAt: string, status: LessonStatus = 'confirmed') => lessonAt({ id, startsAt, status });

describe('sessions (/admin/classrooms groups)', () => {
  it('a lesson is «now» while its room is open, «upcoming» before, «ended» after', () => {
    expect(groupOf(at('a', '2026-10-05T10:05:00.000Z'), NOW)).toBe('now');
    expect(groupOf(at('b', '2026-10-05T12:00:00.000Z'), NOW)).toBe('upcoming');
    expect(groupOf(at('c', '2026-10-05T06:00:00.000Z'), NOW)).toBe('ended');
  });

  it('groups only lessons that still take place, earliest first', () => {
    const lessons = [
      at('late', '2026-10-05T15:00:00.000Z'),
      at('soon', '2026-10-05T12:00:00.000Z'),
      at('x', '2026-10-05T13:00:00.000Z', 'cancelled_by_teacher'),
    ];
    const g = groupSessions(lessons, NOW);
    expect(g.upcoming.map((l) => l.id)).toEqual(['soon', 'late']);
    expect(g.now).toEqual([]);
    expect(g.ended).toEqual([]);
  });

  it('the chip says «بدأت» / «انتهت» by the room, else the lesson status', () => {
    const l = at('a', '2026-10-05T12:00:00.000Z', 'scheduled');
    expect(sessionChip(l, 'now').label).toBe(t.classroom.admin.live);
    expect(sessionChip(l, 'ended').label).toBe(t.classroom.admin.ended);
    expect(sessionChip(l, 'upcoming')).toMatchObject({ tone: 'act', label: t.enums.lessonStatus.scheduled });
  });
});

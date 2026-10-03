import { jana, lesson, yusuf } from '@/today/fixtures';
import { makeupStudents, type MakeupLessonView } from './contract';

// «الخميس 1 أكتوبر 2026 16:00»; "now" is two days later.
const NOW = new Date('2026-10-03T10:00:00.000Z');
const missed = (over: Partial<MakeupLessonView> = {}): MakeupLessonView =>
  lesson({ id: 'm1', status: 'no_show', ...over });

test('a no_show or excused lesson is offered for each student still charged for it', () => {
  expect(makeupStudents(missed(), NOW)).toEqual([yusuf]);
  expect(makeupStudents(missed({ status: 'excused' }), NOW)).toEqual([yusuf]);
  const group = missed({ students: [yusuf, { ...jana, chargeable: false }, { ...jana, id: 's9' }] });
  expect(makeupStudents(group, NOW).map((s) => s.id)).toEqual(['s1', 's9']);
});

test('cancelled, rescheduled and finished lessons are not offered (their unit was never used)', () => {
  for (const status of ['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled', 'completed', 'scheduled'] as const) {
    expect(makeupStudents(missed({ status }), NOW)).toEqual([]);
  }
});

test('not a trial, not itself a makeup, nobody charged → nothing', () => {
  expect(makeupStudents(missed({ trial: true }), NOW)).toEqual([]);
  expect(makeupStudents(missed({ makeup: true }), NOW)).toEqual([]);
  expect(makeupStudents(missed({ students: [{ ...yusuf, chargeable: false }] }), NOW)).toEqual([]);
});

test('the 60-day window: the boundary day still counts, one second older does not', () => {
  const edge = new Date(NOW.getTime() - 60 * 86_400_000);
  const at = (d: Date) => missed({ starts_at: d.toISOString() });
  expect(makeupStudents(at(edge), NOW)).toHaveLength(1);
  expect(makeupStudents(at(new Date(edge.getTime() - 1000)), NOW)).toEqual([]);
});

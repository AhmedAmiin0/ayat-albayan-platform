import type { AssistantLessonView } from '@ab/shared';
import { joinableOf } from './assistant-lessons';

const base: AssistantLessonView = {
  lesson_id: 'l1',
  starts_at: '2026-10-01T13:00:00.000Z',
  ends_at: '2026-10-01T13:45:00.000Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  student_names: ['يوسف'],
};

test('an open session keeps what the join button needs', () => {
  expect(joinableOf(base)).toEqual({ id: 'l1', status: 'confirmed', starts_at: base.starts_at, ends_at: base.ends_at });
});

test('a cancelled session or an unknown status has no entry', () => {
  expect(joinableOf({ ...base, status: 'cancelled_by_admin' })).toBeNull();
  expect(joinableOf({ ...base, status: 'from_the_future' })).toBeNull();
});

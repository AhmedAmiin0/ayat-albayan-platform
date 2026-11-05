import { lessonStatusStyle } from '@ab/shared';
import { UPCOMING_LESSON_STYLE } from '@ab/client-core';
import { t } from '@/core/lib/i18n/i18n';
import { lessonStatusText } from '@/core/ui/feedback/lesson-status';
import { byScheduleStatus, scheduleStatusCounts, statusPill } from './schedule-status';

const day = [
  { id: 'a', status: 'scheduled' as const },
  { id: 'b', status: 'confirmed' as const },
  { id: 'c', status: 'cancelled_by_admin' as const },
  { id: 'd', status: 'cancelled_by_teacher' as const },
  { id: 'e', status: 'completed' as const },
  { id: 'f', status: 'scheduled' as const },
];

test('counts every pill from the whole day; held lessons count only under «الكل»', () => {
  expect(scheduleStatusCounts(day)).toEqual({ all: 6, scheduled: 2, confirmed: 1, cancelled: 2 });
  expect(scheduleStatusCounts([])).toEqual({ all: 0, scheduled: 0, confirmed: 0, cancelled: 0 });
});

test('a pill keeps only its lessons, in order; «الكل» keeps the day', () => {
  expect(byScheduleStatus(day, 'scheduled').map((l) => l.id)).toEqual(['a', 'f']);
  expect(byScheduleStatus(day, 'confirmed').map((l) => l.id)).toEqual(['b']);
  expect(byScheduleStatus(day, 'cancelled').map((l) => l.id)).toEqual(['c', 'd']);
  expect(byScheduleStatus(day, 'all')).toHaveLength(6);
});

test('the pills: «للتأكيد» while required, «قادمة» in the neutral look otherwise; «الكل» has no dot', () => {
  const s = t.sales.academySchedule.status;
  expect(statusPill('scheduled', lessonStatusText(true))).toEqual({ label: s.scheduled, ...lessonStatusStyle.scheduled });
  const off = lessonStatusText(false);
  expect(statusPill('scheduled', off)).toEqual({ label: t.lessons.noConfirm.scheduledShort, ...UPCOMING_LESSON_STYLE });
  expect(statusPill('cancelled', off)).toEqual({ label: s.cancelled, ...lessonStatusStyle.cancelled_by_admin });
  expect(statusPill('all', off)).toEqual({ label: s.all });
});

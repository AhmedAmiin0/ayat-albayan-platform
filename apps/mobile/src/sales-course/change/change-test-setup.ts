import type { SlotView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { MON_19, slot } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { fakeCourseApi, pickLesson, press } from '@/sales-course/testing/course-test-utils';
import { bookedCourse, courseView, SUB_ID } from '@/sales-course/testing/fixtures';

// Test-only: the student of the «تغيير أيام الحلقات» tests, whose course still runs (the jest.mock
// calls stay in each test file).

export const TZ = 'Asia/Riyadh';
/** Thursday 1 Oct 2026, 03:00 Riyadh: «now» in these tests. */
export const NOW = new Date('2026-10-01T00:00:00Z');
/** The course's own days from NOW: today (Thursday) 18:00 and Sunday 4 Oct 17:00 (Riyadh). */
export const THU_1 = '2026-10-01T15:00:00.000Z';
export const SUN_4 = '2026-10-04T14:00:00.000Z';

export const runningCourse = bookedCourse({ subscriptionId: SUB_ID, endsOn: '2026-10-29' });

/** GET answers: course_exists with the running course; her teachers and free slots (Monday 19:00 too). */
export function changeApi(view = courseView({ blocked: 'course_exists', current: runningCourse })) {
  const api = fakeCourseApi(view);
  api.api.slots.push(slot(MON_19));
  return api;
}

/** A GET answerer that honours the slot read's from/to (only the slots inside its window come back). */
export function windowed(fetch: (path: string) => Promise<unknown>) {
  return async (path: string): Promise<unknown> => {
    const answer = await fetch(path);
    if (!path.startsWith('/sales/booking/slots')) return answer;
    const q = new URLSearchParams(path.split('?')[1] ?? '');
    const [from, to] = [Date.parse(q.get('from') ?? ''), Date.parse(q.get('to') ?? '')];
    const res = answer as { slots: SlotView[] };
    return { ...res, slots: res.slots.filter((s) => Date.parse(s.starts_at) >= from && Date.parse(s.starts_at) < to) };
  };
}

/** On the days: the Sunday row (the second from NOW) becomes Monday 19:00, then «التالي». */
export async function changeSundayToMonday(sunday = { row: 1, monday: '2026-10-05' }) {
  await pickLesson(sunday.row, { date: sunday.monday, time: '19:00' });
  await press('button', t.booking.next);
}

/** The change point is the earliest pick (today 18:00); Monday keeps its own 19:00. */
/** A prefilled lesson row's time as the field reads it («الساعة: 17:00»). */
export const rowTime = async (row: number): Promise<unknown> =>
  (await screen.findByTestId(`lesson-time-${row}`)).props.accessibilityLabel;
export const timeLabel = (time: string): string => `${t.lessonTimes.time}: ${time}`;

export const changeBody = {
  subscriptionId: SUB_ID,
  byday: [1, 4],
  startTimeLocal: '18:00',
  startsOn: '2026-10-01',
  startsAt: THU_1,
  dayTimes: [{ weekday: 1, startTimeLocal: '19:00' }],
};

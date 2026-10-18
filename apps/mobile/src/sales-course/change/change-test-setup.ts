import { fakeCourseApi } from '../course-test-utils';
import { bookedCourse, courseView, SUB_ID } from '../fixtures';

// Test-only: the student of the «تغيير أيام الحلقات» tests, whose course still runs (the jest.mock
// calls stay in each test file).

export const TZ = 'Asia/Riyadh';
/** Thursday 1 Oct 2026, 03:00 Riyadh: «now» in these tests. */
export const NOW = new Date('2026-10-01T00:00:00Z');
/** The course's own days from NOW: today (Thursday) 18:00 and Sunday 4 Oct 17:00 (Riyadh). */
export const THU_1 = '2026-10-01T15:00:00.000Z';
export const SUN_4 = '2026-10-04T14:00:00.000Z';

export const runningCourse = bookedCourse({ subscriptionId: SUB_ID, endsOn: '2026-10-29' });

/** GET answers: course_exists with the running course; her teachers and free slots. */
export const changeApi = () => fakeCourseApi(courseView({ blocked: 'course_exists', current: runningCourse }));

/** The change point is the earliest pick (today 18:00); Sunday keeps its own 17:00. */
export const changeBody = {
  subscriptionId: SUB_ID,
  byday: [0, 4],
  startTimeLocal: '18:00',
  startsOn: '2026-10-01',
  startsAt: THU_1,
  dayTimes: [{ weekday: 0, startTimeLocal: '17:00' }],
};

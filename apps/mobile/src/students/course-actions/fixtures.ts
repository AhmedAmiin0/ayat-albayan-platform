import type { CourseStopPreview, ProfileCourseView } from '@ab/shared';
import { MON_19, maryam, noAvailability, slot, SUN_17, THU_18 } from '@/booking/testing/fixtures';
import { ApiError } from '@/core/lib/http/api';
import { runningCourse } from '@/sales-course/change/change-test-setup';

// The student profile's course actions as the API answers them (tests only).

const STUDENT = 's1';
export const SUB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const BASE = '/students/s1';

export const stopPreview = (over: Partial<CourseStopPreview> = {}): CourseStopPreview => ({
  subscriptionId: SUB,
  futureLessons: 3,
  activeRules: 1,
  paid: 300,
  currency: 'SAR',
  stopped: null,
  ...over,
});

const moveView = (): ProfileCourseView => ({
  student: { id: STUDENT, name: 'ريم', code: 'AB-0101', tz: 'Asia/Riyadh' },
  course: { ...runningCourse, subscriptionId: SUB },
  nextLesson: null,
});

/** GET answers: the stop preview, the course to change, the teachers and their free slots. */
export function serve(preview: CourseStopPreview = stopPreview()) {
  return async (path: string): Promise<unknown> => {
    if (path.startsWith(`${BASE}/course-stop`)) return preview;
    if (path.startsWith(`${BASE}/course-teacher/teachers`)) return [maryam, noAvailability];
    if (/\/course-(times|teacher)\/change/.test(path)) return moveView();
    if (path.includes('/booking/slots')) {
      return { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [SUN_17, THU_18, MON_19].map((s) => slot(s)) };
    }
    throw new ApiError(404);
  };
}

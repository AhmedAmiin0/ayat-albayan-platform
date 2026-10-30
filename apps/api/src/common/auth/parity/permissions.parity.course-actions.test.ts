import { systemPermissionsOf, USER_ROLES } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes, type RouteAccess } from './route-walk.test-util';

// Owner 2026-10-30: «إلغاء الاشتراك» / «تغيير المعلم» / «تغيير موعد الحلقات» from the student's
// profile, one key each, held by the system admin and sales by default (migration 985), never a
// teacher or a family.
describe('the student profile course actions', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  const gated = (key: string) =>
    routes
      .filter((r) => r.permission === key)
      .map((r) => r.key)
      .sort();

  it('each key gates exactly its own routes', () => {
    expect(gated('subscriptions.stop')).toEqual([
      'CourseStopController.preview',
      'CourseStopController.stop',
    ]);
    expect(gated('students.change_teacher')).toEqual(
      ['change', 'check', 'options', 'view'].map((h) => `CourseTeacherController.${h}`),
    );
    expect(gated('courses.reschedule')).toEqual(
      ['change', 'check', 'view'].map((h) => `CourseTimesController.${h}`),
    );
  });

  it.each(['subscriptions.stop', 'students.change_teacher', 'courses.reschedule'] as const)(
    '%s is held by the system admin and sales only',
    (key) => {
      expect(USER_ROLES.filter((who) => systemPermissionsOf(who).includes(key))).toEqual([
        'admin',
        'sales',
      ]);
    },
  );
});

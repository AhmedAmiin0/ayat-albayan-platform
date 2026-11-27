import { systemPermissionsOf, USER_ROLES } from '@ab/catalog';
import { beforeAll, describe, expect, it } from 'vitest';
import { permissionKeys, walkRoutes, type RouteAccess } from './route-walk.test-util';

// Student profile course actions: one key each, admin and sales by default, never a teacher.
describe('the student profile course actions', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  const gated = (key: string) =>
    routes
      .filter((r) => permissionKeys(r).includes(key))
      .map((r) => r.key)
      .sort();

  it('each key gates exactly its own routes', () => {
    // The assistant's package cancel shares the stop's key.
    expect(gated('subscriptions.stop')).toEqual([
      'AnyPackageCancelController.cancel',
      'AnyPackageCancelController.check',
      'CourseStopController.preview',
      'CourseStopController.stop',
    ]);
    expect(gated('students.change_teacher')).toEqual(
      ['change', 'check', 'options', 'view'].map((h) => `CourseTeacherController.${h}`),
    );
    // Extending the schedule shares the times' key: admins and assistants.
    expect(gated('courses.reschedule')).toEqual([
      'CourseExtendController.book',
      'CourseExtendController.preview',
      ...['change', 'check', 'view'].map((h) => `CourseTimesController.${h}`),
    ]);
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

  // Refund is an inline check of the stop, never a route gate; system admin only by default.
  it('subscriptions.refund gates no route and is held by the system admin only', () => {
    expect(gated('subscriptions.refund')).toEqual([]);
    const holders = USER_ROLES.filter((who) => systemPermissionsOf(who).includes('subscriptions.refund'));
    expect(holders).toEqual(['admin']);
  });
});

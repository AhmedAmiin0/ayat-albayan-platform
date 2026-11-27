import { describe, expect, it } from 'vitest';
import { coursePauseRoutes } from '../../people/students/course-pause';
import { courseStopRoutes } from '../../people/students/course-stop';
import { salesTrialDateRoutes, trialDateRoutes } from '../../people/students/trial-date';
import { courseCardRoutes } from '../../sales/course/course-card';
import {
  courseChangeRoutes,
  courseTeacherRoutes,
  courseTimesRoutes,
} from '../../sales/course/course-change';
import { bookingRoutes, salesBookingRoutes } from '../booking';
import { bookingExtraRoutes } from '../booking-extras';

interface Access {
  permissions?: readonly string[];
  tags?: readonly string[];
}

const accessOf = (routes: Record<string, Access>) =>
  Object.values(routes).map(({ permissions, tags }) => ({ permissions, tags }));

const each = (routes: Record<string, Access>, permission: string, tag: string) =>
  Object.keys(routes).map(() => ({ permissions: [permission], tags: [tag] }));

const tables: [string, Record<string, Access>, string, string][] = [
  ['booking', bookingRoutes, 'booking.write', 'booking'],
  ['sales booking', salesBookingRoutes, 'self.sales', 'booking'],
  ['booking extras', bookingExtraRoutes, 'booking.write', 'booking'],
  ['trial date', trialDateRoutes, 'booking.write', 'booking'],
  ['sales trial date', salesTrialDateRoutes, 'self.sales', 'booking'],
  ['course change', courseChangeRoutes, 'lessons.write', 'booking'],
  ['course times', courseTimesRoutes, 'courses.reschedule', 'course-actions'],
  ['course teacher', courseTeacherRoutes, 'students.change_teacher', 'course-actions'],
  ['course stop', courseStopRoutes, 'subscriptions.stop', 'course-actions'],
  ['course pause', coursePauseRoutes, 'courses.pause', 'course-pause'],
];

describe('booking route access (docs/62 part 3 §1)', () => {
  it.each(tables)('lets the %s routes in by one permission, under one tag', (_, routes, p, t) => {
    expect(accessOf(routes)).toEqual(each(routes, p, t));
  });

  it('gives each course card route the permission its screen needs', () => {
    expect(accessOf(courseCardRoutes)).toEqual([
      { permissions: ['students.read'], tags: ['course-actions'] },
      { permissions: ['self.sales_academy'], tags: ['course-actions'] },
      { permissions: ['courses.reschedule'], tags: ['course-actions'] },
      { permissions: ['courses.reschedule'], tags: ['course-actions'] },
    ]);
  });
});

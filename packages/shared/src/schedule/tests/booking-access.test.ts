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

interface Table {
  name: string;
  routes: Record<string, Access>;
  permission: string;
  tag: string;
}

const table = (name: string, routes: Record<string, Access>, access: [string, string]): Table => ({
  name,
  routes,
  permission: access[0],
  tag: access[1],
});

const tables = [
  table('booking', bookingRoutes, ['booking.write', 'booking']),
  table('sales booking', salesBookingRoutes, ['self.sales', 'booking']),
  table('booking extras', bookingExtraRoutes, ['booking.write', 'booking']),
  table('trial date', trialDateRoutes, ['booking.write', 'booking']),
  table('sales trial date', salesTrialDateRoutes, ['self.sales', 'booking']),
  table('course change', courseChangeRoutes, ['lessons.write', 'booking']),
  table('course times', courseTimesRoutes, ['courses.reschedule', 'course-actions']),
  table('course teacher', courseTeacherRoutes, ['students.change_teacher', 'course-actions']),
  table('course stop', courseStopRoutes, ['subscriptions.stop', 'course-actions']),
  table('course pause', coursePauseRoutes, ['courses.pause', 'course-pause']),
];

describe('booking route access (docs/62 part 3 §1)', () => {
  it.each(tables)('lets the $name routes in by one permission, under one tag', (t) => {
    const one = { permissions: [t.permission], tags: [t.tag] };
    expect(accessOf(t.routes)).toEqual(Object.keys(t.routes).map(() => one));
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

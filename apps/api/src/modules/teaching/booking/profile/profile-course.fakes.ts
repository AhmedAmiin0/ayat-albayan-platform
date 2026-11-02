// HTTP harness of the profile course actions (test-only, excluded from the build by *.fakes.ts).
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { bootWith, ROLE_ADMIN, ROLE_SALES, ROLE_USERS } from '@/common/auth/auth.fakes';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { ConflictChecker } from '@/modules/teaching/scheduling';
import {
  BODY,
  RULE_A,
  RULE_B,
  S1,
  SUB,
  SUB_ID,
} from '@/modules/teaching/booking/course-change/course-change.fakes';
import { CourseLessonRepo } from '@/modules/teaching/booking/course-change/course-change.lessons';
import { CourseChangeRepo } from '@/modules/teaching/booking/course-change/course-change.repo';
import { CourseChangeViews } from '@/modules/teaching/booking/course-change/course-change.view';
import { CourseChangeWriter } from '@/modules/teaching/booking/course-change/course-change.writer';
import { TeacherOptionsService } from '@/modules/teaching/booking/teacher/teacher-options.service';
import { ProfileCourseRepo } from './profile-course.repo';

export { BODY, S1, SUB_ID };
export const T_OLD = 't1';
export const T_NEW = '00000000-0000-4000-8000-0000000000e2';
export const ADMIN = ROLE_ADMIN;
export const SALES = ROLE_SALES;
export const RESULT = { subscriptionId: SUB_ID, ruleIds: ['n1', 'n2'], endsOn: '2026-11-17' };

function mocks() {
  return {
    checker: { check: vi.fn() },
    writer: { replay: vi.fn(), apply: vi.fn() },
    queries: {
      subscription: vi.fn(),
      rules: vi.fn(),
      course: vi.fn(),
      others: vi.fn(),
      contacts: vi.fn(),
      teacherLink: vi.fn(),
      teacherMode: vi.fn(),
    },
    lessons: { ofCourse: vi.fn(), openFrom: vi.fn(), held: vi.fn() },
    repo: {
      currentSubscription: vi.fn(),
      studentTeacher: vi.fn(),
      teacher: vi.fn(),
      upcoming: vi.fn(),
      assignTeacher: vi.fn(),
    },
    views: { view: vi.fn() },
    options: { list: vi.fn() },
  };
}

/** The seeded happy path: an 8-lesson course of S1 with T_OLD, nothing used, no clash. */
function reset(m: ReturnType<typeof mocks>): void {
  vi.resetAllMocks();
  m.checker.check.mockResolvedValue([]);
  m.writer.replay.mockResolvedValue(null);
  m.writer.apply.mockResolvedValue(RESULT);
  m.queries.subscription.mockResolvedValue(SUB);
  m.queries.rules.mockResolvedValue([RULE_A, RULE_B]);
  m.queries.course.mockResolvedValue([
    { rule_id: 'ra', linked: true, clean: true, from_on: null, until_on: null },
    { rule_id: 'rb', linked: false, clean: true, from_on: '2026-10-01', until_on: null },
  ]);
  m.queries.others.mockResolvedValue([]);
  m.queries.contacts.mockResolvedValue([]);
  m.queries.teacherLink.mockResolvedValue(null);
  m.queries.teacherMode.mockResolvedValue(null);
  m.lessons.ofCourse.mockResolvedValue([]);
  m.lessons.openFrom.mockResolvedValue([{ id: 'l9', status: 'scheduled', rule_id: 'ra' }]);
  m.lessons.held.mockResolvedValue(new Set(['ra:2026-10-19', 'rb:2026-10-21']));
  m.repo.currentSubscription.mockResolvedValue(SUB_ID);
  m.repo.studentTeacher.mockResolvedValue(T_OLD);
  m.repo.teacher.mockResolvedValue({ id: T_NEW, status: 'active' });
  m.repo.upcoming.mockResolvedValue([{ status: 'scheduled', starts_at: '2026-10-19T14:00:00Z' }]);
  m.repo.assignTeacher.mockResolvedValue(true);
  m.views.view.mockResolvedValue({
    student: { id: S1, name: 'سهيلة', code: 'AB-0001', tz: 'Asia/Riyadh' },
    course: { tz: 'Asia/Riyadh' },
  });
}

export async function profileApp() {
  const m = mocks();
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SettingsService)
    .useValue(fakeSettings({ sales_auto_assign: false }))
    .overrideProvider(ConflictChecker)
    .useValue(m.checker)
    .overrideProvider(CourseChangeRepo)
    .useValue(m.queries)
    .overrideProvider(CourseLessonRepo)
    .useValue(m.lessons)
    .overrideProvider(CourseChangeWriter)
    .useValue(m.writer)
    .overrideProvider(ProfileCourseRepo)
    .useValue(m.repo)
    .overrideProvider(CourseChangeViews)
    .useValue(m.views)
    .overrideProvider(TeacherOptionsService)
    .useValue(m.options);
  const app = await bootWith(builder, ROLE_USERS);
  const post = (token: string, url: string, body: object) =>
    app.inject({
      method: 'POST',
      url,
      payload: body,
      headers: { authorization: `Bearer ${token}` },
    });
  const get = (token: string, url: string) =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
  return { app, m, post, get, reset: () => reset(m) };
}

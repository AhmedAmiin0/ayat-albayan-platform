import type { AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { ruleSettingsOf } from '@/common/rules/rule-settings.fakes';
import {
  fakePolicy,
  type FakePolicyInput,
} from '@/modules/messaging/notification-rules/policy/policy.fakes';
import type { StudentTrialStatus } from '@/modules/finance/subscriptions/trial/student-trial-status';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import type { TeacherLessonLinks } from '@/modules/teaching/lesson-links';
import { BookingFollowUps } from '@/modules/teaching/booking/core/booking.follow-ups';
import type { AlertLesson } from './teacher-alert.plan';
import type { TeacherAlertRepo } from './teacher-alert.repo';
import { TeacherAlert, TeacherAlertDeps } from './teacher-alert.service';

type AlertOver = {
  lessons?: AlertLesson[];
  approved?: boolean;
  v3?: boolean;
  settings?: Partial<AcademySettings>;
  rules?: Omit<FakePolicyInput, 'settings'>;
};

/** Tests only: a real TeacherAlert over vi.fn reads, push, a fake policy and sender; BookingFollowUps over it and a vi.fn trial status. */
export function fakeTeacherAlert(over: AlertOver = {}) {
  const queries = {
    lessons: vi.fn(async () => over.lessons ?? []),
    students: vi.fn(async (ids: readonly string[]) =>
      ids.map((id, i) => ({ id, name: ['سهيلة', 'مريم'][i] ?? 'يوسف' })),
    ),
    sendable: vi.fn(
      async () =>
        new Set([
          ...((over.approved ?? true) ? ['teacher_new_student'] : []),
          ...(over.v3 ? ['teacher_lesson_v3'] : []),
        ]),
    ),
    academyAuto: vi.fn(async () => false),
    queue: vi.fn(async (rows: readonly unknown[]) => rows.length),
  };
  const push = { notifyProfiles: vi.fn(async () => undefined) };
  const sender = { kick: vi.fn(async () => undefined) };
  const policy = fakePolicy({ ...over.rules, settings: ruleSettingsOf(over.settings) });
  const links = {
    forLesson: vi.fn(async (l: { id: string }) => ({
      join: `join-${l.id}`,
      report: {
        token: `rep-${l.id}`,
        url: `https://app.example/teacher-report/rep-${l.id}`,
        exp: 0,
      },
    })),
  };
  const deps = new TeacherAlertDeps(
    push as unknown as PushService,
    policy,
    sender as unknown as MessageSender,
    links as unknown as TeacherLessonLinks,
  );
  const alert = new TeacherAlert(queries as unknown as TeacherAlertRepo, deps);
  const trial = { evaluate: vi.fn(async () => 0) };
  const after = new BookingFollowUps(alert, trial as unknown as StudentTrialStatus);
  return { alert, after, trial, queries, push, sender, links };
}

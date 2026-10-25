import type { AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import type { PushService } from '../../common/push/push.service';
import { ruleSettingsOf } from '../../common/rules/rule-settings.fakes';
import { fakePolicy, type FakePolicyInput } from '../notification-rules/policy.fakes';
import type { StudentTrialStatus } from '../subscriptions/student-trial-status';
import type { MessageSender } from '../whatsapp/sender/message.sender';
import { BookingFollowUps } from './booking.follow-ups';
import type { AlertLesson } from './teacher-alert.plan';
import type { TeacherAlertQueries } from './teacher-alert.queries';
import { TeacherAlert, TeacherAlertDeps } from './teacher-alert.service';

type AlertOver = { lessons?: AlertLesson[]; approved?: boolean; settings?: Partial<AcademySettings>; rules?: Omit<FakePolicyInput, 'settings'> };

/** Tests only: a real TeacherAlert over vi.fn reads, push, a fake policy and sender; BookingFollowUps over it and a vi.fn trial status. */
export function fakeTeacherAlert(over: AlertOver = {}) {
  const queries = {
    lessons: vi.fn(async () => over.lessons ?? []),
    students: vi.fn(async (ids: readonly string[]) => ids.map((id, i) => ({ id, name: ['سهيلة', 'مريم'][i] ?? 'يوسف' }))),
    approved: vi.fn(async () => over.approved ?? true),
    queue: vi.fn(async (rows: readonly unknown[]) => rows.length),
  };
  const push = { notifyProfiles: vi.fn(async () => undefined) };
  const sender = { kick: vi.fn(async () => undefined) };
  const policy = fakePolicy({ ...over.rules, settings: ruleSettingsOf(over.settings) });
  const deps = new TeacherAlertDeps(push as unknown as PushService, policy, sender as unknown as MessageSender);
  const alert = new TeacherAlert(queries as unknown as TeacherAlertQueries, deps);
  const trial = { evaluate: vi.fn(async () => 0) };
  const after = new BookingFollowUps(alert, trial as unknown as StudentTrialStatus);
  return { alert, after, trial, queries, push, sender };
}

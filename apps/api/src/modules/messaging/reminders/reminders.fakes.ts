import type { AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import type { PushService } from '../../../common/push/push.service';
import { ruleSettingsOf } from '../../../common/rules/rule-settings.fakes';
import { readerOf } from '../../../common/settings/settings.fakes';
import { fakePolicy, type FakePolicyInput } from '../notification-rules/policy/policy.fakes';
import type { QueuedMessage } from './queued-row';
import { RemindersDeps } from './reminders.deps';
import { RemindersJob } from './reminders.job';
import type { RoomCandidate } from './plan/reminders.links';
import type { ReminderLesson } from './plan/reminders.plan';
import type { RemindersQueries } from './reminders.queries';
import { RemindersSettings } from './reminders.settings';

// Invented sample data for the reminder tests: no real student, teacher or guardian.

/** Sun 4 Oct 2026 17:00 Riyadh = 15:00 London (BST) = 14:00Z. */
export const STARTS_AT = '2026-10-04T14:00:00Z';

export const RIYADH_GUARDIAN = { id: 'g-riyadh', phone_e164: '+966500000101', tz: 'Asia/Riyadh' };
export const LONDON_GUARDIAN = { id: 'g-london', phone_e164: '+447700900102', tz: 'Europe/London' };

export function sampleLesson(over: Partial<ReminderLesson> = {}): ReminderLesson {
  return {
    id: 'lesson-1',
    starts_at: STARTS_AT,
    ends_at: '2026-10-04T14:45:00Z',
    status: 'scheduled',
    meeting_link: 'https://meet.jit.si/ab-room-7',
    teacher: { id: 't-1', display_name_ar: 'هدى', phone_e164: '+966500000201', tz: 'Asia/Riyadh' },
    students: [
      { id: 's-1', name: 'سهيلة', guardian: RIYADH_GUARDIAN },
      { id: 's-2', name: 'مريم', guardian: RIYADH_GUARDIAN },
      { id: 's-3', name: 'ياسين', guardian: LONDON_GUARDIAN },
    ],
    ...over,
  };
}

/** `at` as a Date (tests read better with ISO strings). */
export const at = (iso: string) => new Date(iso);

export type JobOpts = {
  settings?: Partial<AcademySettings>;
  approved?: string[];
  pushed?: string[];
  lessons?: ReminderLesson[];
  /** What RoomLinks returns for a non-empty candidate list (the family links it minted). */
  room?: QueuedMessage[];
  /** The notification rules (mode, rows, fail); the 8 rule keys in `settings` go to the policy's legacy settings. */
  rules?: Omit<FakePolicyInput, 'settings'>;
};

/** A RemindersJob over mocked queries, settings and push; `queued` collects every queued row. */
export function fakeJob(opts: JobOpts = {}) {
  const queued: QueuedMessage[] = [];
  const queries = {
    dropCancelled: vi.fn(async () => 0),
    upcoming: vi.fn(async () => opts.lessons ?? [sampleLesson()]),
    approved: vi.fn(async () => new Set(opts.approved ?? [])),
    queue: vi.fn(async (rows: readonly QueuedMessage[]) => queued.push(...rows)),
    pushedSubjects: vi.fn(async () => new Set(opts.pushed ?? [])),
    roomLinks: vi.fn(async (candidates: readonly RoomCandidate[]) => (candidates.length > 0 ? (opts.room ?? []) : [])),
  };
  // Automatic messages ON unless a test says otherwise (the default is OFF, migration 162).
  const settings = readerOf(RemindersSettings, { auto_messages_enabled: true, ...opts.settings });
  const push = { notifyAdmins: vi.fn(async () => undefined) };
  const job = new RemindersJob(
    queries as unknown as RemindersQueries,
    settings,
    new RemindersDeps(push as unknown as PushService, fakePolicy({ ...opts.rules, settings: ruleSettingsOf(opts.settings) })),
  );
  return { job, queries, queued, push };
}

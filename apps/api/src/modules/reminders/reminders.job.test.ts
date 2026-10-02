import type { AcademySettings } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../common/push/push.service';
import { SETTING_DEFAULTS, type SettingsService } from '../../common/settings/settings.service';
import type { QueuedMessage } from './queued-row';
import { at, sampleLesson } from './reminders.fakes';
import { RemindersJob } from './reminders.job';
import { confirmationPush, needsConfirmation, type ReminderLesson } from './reminders.plan';
import type { RemindersQueries } from './reminders.queries';

type Opts = { settings?: Partial<AcademySettings>; approved?: string[]; pushed?: string[]; lessons?: ReminderLesson[] };

function setup(opts: Opts = {}) {
  const queued: QueuedMessage[] = [];
  const queries = {
    dropCancelled: vi.fn(async () => 0),
    upcoming: vi.fn(async () => opts.lessons ?? [sampleLesson()]),
    approved: vi.fn(async () => new Set(opts.approved ?? [])),
    queue: vi.fn(async (rows: readonly QueuedMessage[]) => queued.push(...rows)),
    pushedSubjects: vi.fn(async () => new Set(opts.pushed ?? [])),
  };
  const settings = { all: async () => ({ ...SETTING_DEFAULTS, ...opts.settings }) };
  const push = { notifyAdmins: vi.fn(async () => undefined) };
  const job = new RemindersJob(
    queries as unknown as RemindersQueries,
    settings as unknown as SettingsService,
    push as unknown as PushService,
  );
  return { job, queries, queued, push };
}

describe('RemindersJob.runOnce (R-MSG-02)', () => {
  it('queues the same-day reminders, looking 25 h ahead', async () => {
    const { job, queries, queued } = setup();
    const summary = await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(queries.upcoming).toHaveBeenCalledWith({ now: at('2026-10-04T13:10:00Z'), until: at('2026-10-05T14:10:00Z') });
    expect(queued.map((r) => r.template_key)).toEqual(['lesson_reminder', 'lesson_reminder', 'teacher_lesson_reminder']);
    expect(summary).toMatchObject({ lessons: 1, queued: 3 });
  });

  it('day-before only when reminder_24h_enabled and lesson_reminder_24h is approved', async () => {
    const now = at('2026-10-03T14:00:00Z');
    const off = setup({ approved: ['lesson_reminder_24h'] });
    await off.job.runOnce(now);
    expect(off.queries.approved).not.toHaveBeenCalled();
    expect(off.queued).toEqual([]);

    const unapproved = setup({ settings: { reminder_24h_enabled: true } });
    await unapproved.job.runOnce(now);
    expect(unapproved.queued).toEqual([]);

    const on = setup({ settings: { reminder_24h_enabled: true }, approved: ['lesson_reminder_24h'] });
    await on.job.runOnce(now);
    expect(on.queued.map((r) => r.template_key)).toEqual(['lesson_reminder_24h', 'lesson_reminder_24h']);
  });

  it('drops queued reminders of cancelled lessons every tick', async () => {
    const { job, queries } = setup({ lessons: [] });
    await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(queries.dropCancelled).toHaveBeenCalledWith(at('2026-10-04T13:10:00Z'));
  });

  it('a failing cleanup never blocks queuing', async () => {
    const { job, queries, queued } = setup();
    queries.dropCancelled.mockRejectedValueOnce(new Error('embed failed'));
    expect(await job.runOnce(at('2026-10-04T13:10:00Z'))).toMatchObject({ queued: 3, dropped: 0 });
    expect(queued).toHaveLength(3);
  });

  it('never throws: a failing read is logged and the summary is empty', async () => {
    const { job, queries } = setup();
    queries.upcoming.mockRejectedValueOnce(new Error('db down'));
    await expect(job.runOnce(at('2026-10-04T13:10:00Z'))).resolves.toMatchObject({ queued: 0, pushed: 0 });
  });
});

describe('lesson_needs_confirmation push (R-MOB-01)', () => {
  const scheduled = sampleLesson();
  const confirmed = sampleLesson({ id: 'lesson-2', status: 'confirmed' });
  const later = sampleLesson({ id: 'lesson-3', starts_at: '2026-10-05T14:01:00Z' });

  it('a still-scheduled lesson starting within 24 h', () => {
    const now = at('2026-10-03T14:00:00Z');
    expect(needsConfirmation([scheduled, confirmed, later], now).map((l) => l.id)).toEqual(['lesson-1']);
    expect(needsConfirmation([scheduled], at('2026-10-03T13:59:00Z'))).toEqual([]);
    expect(needsConfirmation([scheduled], at('2026-10-04T14:00:00Z'))).toEqual([]);
  });

  it('names every student; the time is Riyadh (one text for all admins)', () => {
    expect(confirmationPush(scheduled)).toEqual({
      subject: 'lesson-1',
      vars: { names: 'سهيلة ومريم وياسين', when: 'الأحد 4 أكتوبر 17:00' },
      data: { lessonId: 'lesson-1' },
    });
  });

  it('pushes once: lessons already in push_notifications are skipped', async () => {
    const { job, push, queries } = setup({ lessons: [scheduled, confirmed], pushed: [] });
    await job.runOnce(at('2026-10-04T10:00:00Z'));
    expect(push.notifyAdmins).toHaveBeenCalledWith('lesson_needs_confirmation', confirmationPush(scheduled));
    expect(queries.pushedSubjects).toHaveBeenCalledWith('lesson_needs_confirmation', at('2026-10-02T10:00:00Z'));

    const again = setup({ lessons: [scheduled], pushed: ['lesson-1'] });
    expect(await again.job.runOnce(at('2026-10-04T10:05:00Z'))).toMatchObject({ pushed: 0 });
    expect(again.push.notifyAdmins).not.toHaveBeenCalled();
  });
});

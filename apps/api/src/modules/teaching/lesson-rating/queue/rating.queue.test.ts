import { SETTING_DEFAULTS } from '@ab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { fakePolicy, type FakePolicyInput } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { LessonRatingSettings } from '@/modules/teaching/lesson-rating/lesson-rating.settings';
import { heldLesson, LESSON_ID, NOW } from '@/modules/teaching/lesson-rating/rating.fakes';
import { RatingJob } from './rating.job';
import type { RatingRepo } from '@/modules/teaching/lesson-rating/rating.repo';
import { RatingQueue } from './rating.queue';
import { RatingReads } from '@/modules/teaching/lesson-rating/rating.reads';

// The automatic lesson_rating gates: feedback_mode, the automatic-messages switch, the template.

const queries = { approved: vi.fn(), queue: vi.fn(), held: vi.fn(), byIds: vi.fn() };
const sender = { kick: vi.fn() };
let settings = { ...SETTING_DEFAULTS, auto_messages_enabled: true };
let rules: FakePolicyInput = {};

function setup() {
  const queue = new RatingQueue(
    queries as unknown as RatingRepo,
    new RatingReads(readerOf(LessonRatingSettings, settings), fakePolicy({ ...rules, settings: { feedback_mode: settings.feedback_mode } })),
    sender as unknown as MessageSender,
  );
  const events = new LessonEvents();
  const job = new RatingJob(queue, queries as unknown as RatingRepo, events);
  job.onModuleInit();
  return { job, events };
}

describe('RatingQueue / RatingJob', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    settings = { ...SETTING_DEFAULTS, auto_messages_enabled: true };
    rules = {};
    queries.approved.mockResolvedValue(true);
    queries.queue.mockImplementation(async (rows: unknown[]) => rows.length);
    queries.held.mockResolvedValue([heldLesson()]);
    queries.byIds.mockResolvedValue([heldLesson()]);
    sender.kick.mockResolvedValue(undefined);
  });

  it('default (buttons, switch ON, approved): the sweep queues the rating and kicks the sender', async () => {
    expect(SETTING_DEFAULTS.feedback_mode).toBe('buttons');
    await expect(setup().job.runOnce(NOW)).resolves.toEqual({ queued: 1, skipped: null });
    expect(queries.held).toHaveBeenCalledWith({ since: new Date(NOW.getTime() - 36 * 3_600_000), until: NOW });
    expect(queries.queue.mock.calls[0]?.[0]).toEqual([expect.objectContaining({ template_key: 'lesson_rating', lesson_id: LESSON_ID })]);
    expect(sender.kick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['feedback_mode link', { feedback_mode: 'link' as const }, 'mode_link'],
    ['automatic messages OFF', { auto_messages_enabled: false }, 'auto_off'],
  ])('%s → nothing queued, no lesson read', async (_name, over, skipped) => {
    settings = { ...settings, ...over };
    await expect(setup().job.runOnce(NOW)).resolves.toEqual({ queued: 0, skipped });
    expect(queries.held).not.toHaveBeenCalled();
    expect(queries.queue).not.toHaveBeenCalled();
  });

  it.each([
    ['module mode, the lesson_rating row off', { mode: 'module' as const, rows: [{ key: 'lesson_rating', enabled: false }] }, 'mode_link'],
    ['rules unreadable (fail closed)', { fail: true }, 'rules_unread'],
  ])('%s → nothing queued, no lesson read', async (_name, over, skipped) => {
    rules = over;
    await expect(setup().job.runOnce(NOW)).resolves.toEqual({ queued: 0, skipped });
    expect(queries.held).not.toHaveBeenCalled();
  });

  it('module mode, the row on: queued even while feedback_mode says link', async () => {
    settings = { ...settings, feedback_mode: 'link' };
    rules = { mode: 'module', rows: [{ key: 'lesson_rating', enabled: true }] };
    await expect(setup().job.runOnce(NOW)).resolves.toEqual({ queued: 1, skipped: null });
  });

  it('template not approved by Meta yet → nothing queued (no pile-up before approval)', async () => {
    queries.approved.mockResolvedValue(false);
    await expect(setup().job.runOnce(NOW)).resolves.toEqual({ queued: 0, skipped: 'not_approved' });
    expect(queries.queue).not.toHaveBeenCalled();
  });

  it('a replayed pass (rows already there) queues 0 and does not kick', async () => {
    queries.queue.mockResolvedValue(0);
    await expect(setup().job.runOnce(NOW)).resolves.toEqual({ queued: 0, skipped: null });
    expect(sender.kick).not.toHaveBeenCalled();
  });

  it('a lesson marked completed (LessonEvents) queues its rating right away', async () => {
    const { events } = setup();
    await events.changed([LESSON_ID]);
    expect(queries.byIds).toHaveBeenCalledWith([LESSON_ID]);
    expect(queries.queue).toHaveBeenCalledTimes(1);
  });

  it('never throws: a DB failure is logged and the status change is not affected', async () => {
    queries.held.mockRejectedValue(new Error('db down'));
    await expect(setup().job.runOnce(NOW)).resolves.toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { AlertsJob } from './alerts.job';
import type { AlertsRepo } from './alerts.repo';
import type { SubscriptionAlertsService } from './alerts.service';
import type { CourseDue } from '@/modules/finance/subscriptions/course-due/course-due';

const T1 = new Date('2026-11-23T10:00:00Z');
const T2 = new Date('2026-11-23T10:15:00Z');
const T3 = new Date('2026-11-23T10:30:00Z');
const BOOT_SINCE = new Date('2026-11-22T10:00:00Z');

function jobWith(failedPerRun: readonly number[]) {
  const sweepStudents = vi.fn().mockResolvedValue(['s1']);
  const evaluateStudents = vi.fn();
  for (const failed of failedPerRun) evaluateStudents.mockResolvedValueOnce(failed);
  const repo = { sweepStudents } as unknown as AlertsRepo;
  const alerts = { evaluateStudents } as unknown as SubscriptionAlertsService;
  const courseDue = { sweep: vi.fn().mockResolvedValue(undefined) } as unknown as CourseDue;
  return { job: new AlertsJob(repo, alerts, new LessonEvents(), courseDue), sweepStudents };
}

describe('AlertsJob sweep window', () => {
  it('starts the next window at the last sweep that evaluated every student', async () => {
    const { job, sweepStudents } = jobWith([0, 0]);
    await job.runOnce(T1);
    await job.runOnce(T2);
    expect(sweepStudents.mock.calls).toEqual([[BOOT_SINCE], [T1]]);
  });

  it('keeps the window open after a sweep with failures, so expired packages are retried', async () => {
    const { job, sweepStudents } = jobWith([1, 0, 0]);
    await job.runOnce(T1);
    await job.runOnce(T2);
    await job.runOnce(T3);
    expect(sweepStudents.mock.calls).toEqual([[BOOT_SINCE], [BOOT_SINCE], [T2]]);
  });

  it('keeps the window open when the sweep aborts', async () => {
    const { job, sweepStudents } = jobWith([0]);
    sweepStudents.mockRejectedValueOnce(new Error('db down'));
    await job.runOnce(T1);
    await job.runOnce(T2);
    expect(sweepStudents.mock.calls).toEqual([[BOOT_SINCE], [BOOT_SINCE]]);
  });
});

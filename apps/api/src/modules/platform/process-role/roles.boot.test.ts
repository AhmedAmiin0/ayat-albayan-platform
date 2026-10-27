import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { ActivityRetentionJob } from '../../../common/activity/activity.retention.job';
import { ConfigSeeder } from '../../../common/config-store/boundaries/config-seeder';
import { ExpensesJob } from '../../finance/expenses/expenses.job';
import { AlertsJob } from '../../finance/subscriptions/alerts/alerts.job';
import { StudentExpiryJob } from '../../finance/subscriptions/student-lifecycle/student-expiry.job';
import { CallsSweeper } from '../../messaging/calls/flow/calls.sweeper';
import { FollowUpsJob } from '../../messaging/follow-ups/follow-ups.job';
import { PushReceiptsJob } from '../../messaging/push/push-receipts.job';
import { RemindersJob } from '../../messaging/reminders/reminders.job';
import { ExternalCatchUpJob } from '../../messaging/webhook/external/external-catchup.job';
import { CrmMediaCopyJob } from '../../messaging/whatsapp/messages/crm-copy/crm-media-copy.job';
import { WaMediaRetentionJob } from '../../messaging/whatsapp/messages/wa-media.retention.job';
import { MessageSender } from '../../messaging/whatsapp/sender/message.sender';
import { GoogleSyncJob } from '../google-sync/sync/google-sync.job';
import { ReportPdfJob } from '../../reporting/report-pdf/report-pdf.job';
import { RatingJob } from '../../teaching/lesson-rating/queue/rating.job';
import { HorizonJob } from '../../teaching/scheduling/occurrences/horizon.job';
import { RecordingMaintenanceJob } from '../../teaching/student-recordings/retention/recording-maintenance.job';

/** Every job's pass, as its timers call it (the template boot check needs a configured line: its own tests). */
const PASSES = [
  [ActivityRetentionJob, 'runOnce'],
  [ConfigSeeder, 'run'],
  [ExpensesJob, 'runOnce'],
  [AlertsJob, 'runOnce'],
  [StudentExpiryJob, 'runOnce'],
  [CallsSweeper, 'runOnce'],
  [FollowUpsJob, 'runOnce'],
  [PushReceiptsJob, 'runOnce'],
  [RemindersJob, 'runOnce'],
  [ExternalCatchUpJob, 'runOnce'],
  [WaMediaRetentionJob, 'runOnce'],
  [CrmMediaCopyJob, 'runOnce'],
  [MessageSender, 'runOnce'],
  [GoogleSyncJob, 'kick'],
  [ReportPdfJob, 'runOnce'],
  [RatingJob, 'runOnce'],
  [HorizonJob, 'runOnce'],
  [RecordingMaintenanceJob, 'runOnce'],
] as const;

/** Boots AppModule in `role`, lets 25 hours pass (daily jobs included), and names the jobs whose pass ran. */
async function jobsThatRan(role: string): Promise<string[]> {
  vi.stubEnv('APP_ROLE', role);
  const spies = PASSES.map(([job, method]) => {
    const proto = job.prototype as unknown as Record<string, () => Promise<unknown>>;
    return { name: job.name, spy: vi.spyOn(proto, method).mockResolvedValue(undefined) };
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await vi.advanceTimersByTimeAsync(25 * 3_600_000);
  await app.close();
  return spies.filter((s) => s.spy.mock.calls.length > 0).map((s) => s.name);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('process roles on the real AppModule (docs/09)', () => {
  const every = PASSES.map(([job]) => job.name);

  it('api: not one background job runs (two copies never both send, remind or sync)', async () => {
    expect(await jobsThatRan('api')).toEqual([]);
  }, 60_000);

  it('worker: every job runs', async () => {
    expect(await jobsThatRan('worker')).toEqual(every);
  }, 60_000);

  it('all (unset, local dev and tests): every job runs, as one process did before', async () => {
    expect(await jobsThatRan('')).toEqual(every);
  }, 60_000);
});

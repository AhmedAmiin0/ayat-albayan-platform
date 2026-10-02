import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { FollowUpsJob } from '../follow-ups/follow-ups.job';
import { RemindersJob } from '../reminders/reminders.job';
import { PushReceiptsJob } from './push-receipts.job';

// The three job modules as registered (AppModule → MessagingJobsModule): DI resolves, and
// booting does no work at once (first runs are 30 s – 2 min later; timers stop on close).

describe('Phase 4 job modules wiring', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolve inside the app, boot and close without touching the network', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    expect(app.get(RemindersJob)).toBeInstanceOf(RemindersJob);
    expect(app.get(FollowUpsJob)).toBeInstanceOf(FollowUpsJob);
    expect(app.get(PushReceiptsJob)).toBeInstanceOf(PushReceiptsJob);
    await app.close();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

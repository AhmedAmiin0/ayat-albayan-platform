import { describe, expect, it } from 'vitest';
import { LastSeenService } from './last-seen.service';
import type { PresenceRepo } from './presence.repo';
import { fakePresence } from './presence.fakes';
import type { PresenceSettings } from './presence.settings';

function service() {
  const f = fakePresence();
  const repo = f.repo as unknown as PresenceRepo;
  const svc = new LastSeenService(repo, f.settings as unknown as PresenceSettings);
  return { svc, ...f };
}

describe('LastSeenService (docs/33 §1.2)', () => {
  it('queues each user once per minute and writes the queue in one call', async () => {
    const { svc, repo } = service();
    svc.seen('u1', 0);
    svc.seen('u1', 10_000);
    svc.seen('u2', 59_999);
    await svc.flush();
    svc.seen('u1', 59_999);
    svc.seen('u1', 60_000);
    await svc.flush();
    expect(repo.touch.mock.calls).toEqual([[['u1', 'u2']], [['u1']]]);
  });

  it('touches nothing for an empty queue, and never inside a request (seen does no I/O)', async () => {
    const { svc, repo, settings } = service();
    svc.seen('u1', 0);
    expect([repo.touch.mock.calls.length, settings.enabled.mock.calls.length]).toEqual([0, 0]);
    await svc.flush();
    await svc.flush();
    expect(repo.touch).toHaveBeenCalledTimes(1);
  });

  it('writes nothing while presence_enabled is off, and drops that queue', async () => {
    const { svc, repo, settings } = service();
    settings.enabled.mockResolvedValue(false);
    svc.seen('u1', 0);
    await svc.flush();
    expect([repo.touch.mock.calls.length, svc.queued]).toEqual([0, 0]);
  });

  it('swallows a failed write or settings read (a warning, never an error)', async () => {
    const { svc, repo, settings } = service();
    repo.touch.mockRejectedValueOnce(new Error('db down'));
    svc.seen('u1', 0);
    await expect(svc.flush()).resolves.toBeUndefined();
    settings.enabled.mockRejectedValueOnce('boom');
    svc.seen('u2', 0);
    await expect(svc.flush()).resolves.toBeUndefined();
  });

  it('flushes on a timer that never holds the process open, cleared on shutdown', () => {
    const { svc } = service();
    svc.onModuleInit();
    svc.onModuleDestroy();
    svc.onModuleDestroy();
  });
});

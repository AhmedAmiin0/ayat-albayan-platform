import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { FLOOR } from '@/modules/messaging/webhook/external/external-catchup.job';
import { kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import { MAX_PAGES } from './inbound-catchup.service';
import { catchUpRig, kapsoInbound, NOW, page } from './inbound.fakes';

// Finding 2 of PR #452: the week read is not one-shot; it repeats until it completed once.

const DAY_BACK = new Date(NOW.getTime() - 86_400_000).toISOString();
const sinces = (x: ReturnType<typeof catchUpRig>) =>
  x.kapso.inbound.mock.calls.map((c) => (c[1] as { since: string; after?: string }))
    .filter((q) => !q.after)
    .map((q) => q.since);

function rig() {
  const x = catchUpRig();
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  x.repo.newestInbound.mockResolvedValue(new Date(NOW.getTime() - 60_000));
  return x;
}

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('InboundCatchUpJob — the full (week) read', () => {
  it('a Kapso error (timeout, 5xx, 429): the next run reads the week again', async () => {
    const x = rig();
    x.kapso.inbound.mockRejectedValueOnce(new Error('WhatsApp HTTP 503'));
    await x.job.runOnce(NOW);
    await x.job.runOnce(NOW);
    await x.job.runOnce(NOW);
    expect(sinces(x)).toEqual([FLOOR.toISOString(), FLOOR.toISOString(), DAY_BACK]);
  });

  it('a failed item: the next run reads the week again', async () => {
    const x = rig();
    vi.spyOn(x.inbound, 'handle').mockRejectedValueOnce(new Error('db: down'));
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound()]));
    await x.job.runOnce(NOW);
    await x.job.runOnce(NOW);
    await x.job.runOnce(NOW);
    expect(sinces(x)).toEqual([FLOOR.toISOString(), FLOOR.toISOString(), DAY_BACK]);
    expect(x.queries.stored).toHaveLength(1);
  });

  it(`capped at ${MAX_PAGES} pages: not complete, the week is read again`, async () => {
    const x = rig();
    let n = 0;
    x.kapso.inbound.mockImplementation(async () => page([kapsoInbound({ id: `wamid.${n++}` })], 'more'));
    await x.job.runOnce(NOW);
    await x.job.runOnce(NOW);
    expect(sinces(x)).toEqual([FLOOR.toISOString(), FLOOR.toISOString()]);
  });
});

import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { ExternalCatchUpJob, FLOOR } from '@/modules/messaging/webhook/external/external-catchup.job';
import { kapsoEnv, kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import type { ExternalQueries } from '@/modules/messaging/webhook/external/external.queries';
import type { KapsoHistory } from '@/modules/messaging/webhook/external/kapso-history';
import { catchUpRig, kapsoInbound, NOW, page } from './inbound.fakes';

const NUMBER_A = '00000000-0000-4000-8000-0000000000a1';
const NUMBER_B = '00000000-0000-4000-8000-0000000000b2';
const NEXT_DAY = new Date(NOW.getTime() + 86_400_000);
const gapAlerts = (notify: { mock: { calls: unknown[][] } }) =>
  notify.mock.calls.filter((c) => (c[1] as { subject: string }).subject.startsWith('kapso-webhook:'));

/** Two Kapso chat numbers (module mode): A fails at Kapso, B answers. */
function twoNumbers(): void {
  const base = { label: 'chat', purpose: 'chat', waba_id: 'waba-1', enabled: true, appSecret: null } as const;
  const n = (id: string, phoneId: string, rank: number): OverlayNumber => ({
    ...base,
    ...{ id, phone_number_id: phoneId, is_default: rank === 0, fallback_rank: rank },
    created_at: '2026-10-23T00:00:00Z',
    env: kapsoEnv({ phoneNumberId: phoneId }),
  });
  const numbers = [n(NUMBER_A, 'phone-a', 0), n(NUMBER_B, 'phone-b', 1)];
  setNumbersOverlay({ values: {}, numberIds: { chat: 'a' }, numbers });
}

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('InboundCatchUpJob', () => {
  it('late messages raise ONE admin alert per line per day, in Arabic, counts only', async () => {
    const x = catchUpRig();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    let n = 0;
    x.kapso.inbound.mockImplementation(async () => page([kapsoInbound({ id: `wamid.${n++}` })]));
    await x.job.runOnce(NOW);
    await x.job.runOnce(new Date(NOW.getTime() + 600_000));
    const [first] = gapAlerts(x.push.notifyAdmins);
    expect(gapAlerts(x.push.notifyAdmins)).toHaveLength(1);
    expect(first?.[0]).toBe('new_message');
    expect(first?.[1]).toMatchObject({
      subject: `kapso-webhook:00000000-0000-4000-8000-0000000000d1:2026-10-30`,
      title: 'لا تصل رسائل العائلات من Kapso مباشرة',
      vars: { name: 'Kapso', text: expect.stringContaining('تحقّق من الـ webhook في Kapso') },
    });
    await x.job.runOnce(NEXT_DAY);
    expect(gapAlerts(x.push.notifyAdmins)).toHaveLength(2);
  });

  it('nothing late → no alert', async () => {
    const x = catchUpRig();
    await x.job.runOnce(NOW);
    expect(x.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('the first run after boot reads the whole week; later runs the newest row / last day', async () => {
    const x = catchUpRig();
    x.repo.newestInbound.mockResolvedValue(new Date(NOW.getTime() - 60_000));
    await x.job.runOnce(NOW);
    await x.job.runOnce(NOW);
    const sinces = x.kapso.inbound.mock.calls.map((c) => (c[1] as { since: string }).since);
    const [first, second] = sinces;
    expect(first).toBe(FLOOR.toISOString()); // 7 days back is before FLOOR on NOW
    expect(second).toBe(new Date(NOW.getTime() - 86_400_000).toISOString());
  });

  it('a Kapso error on one number stops that number only', async () => {
    twoNumbers();
    const x = catchUpRig();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    x.kapso.inbound.mockImplementation(async (env: { phoneNumberId: string }) => {
      if (env.phoneNumberId === 'phone-a') throw new Error('WhatsApp HTTP 502');
      return page([kapsoInbound()]);
    });
    const [a, b] = await x.job.runOnce(NOW);
    expect(a).toMatchObject({ stored: 0 });
    expect(b).toMatchObject({ stored: 1 });
    expect(x.queries.stored.map((r) => r.number_id)).toEqual([NUMBER_B]);
  });

  it('the outbound catch-up is unchanged: it never stores a family message', async () => {
    const x = catchUpRig();
    const ext = x.ext as unknown as ExternalQueries;
    const out = new ExternalCatchUpJob(ext, x.external.store, x.kapso as unknown as KapsoHistory);
    x.kapso.outbound.mockResolvedValue(page([kapsoInbound()]));
    const [counts] = await out.runOnce(NOW);
    expect(counts).toMatchObject({ listed: 1, stored: 0, skipped: 1 });
    expect(x.queries.stored).toHaveLength(0);
    expect(x.kapso.inbound).not.toHaveBeenCalled();
  });
});

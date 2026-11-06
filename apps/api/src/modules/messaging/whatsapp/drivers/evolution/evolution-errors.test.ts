import { WA_ERROR } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { failurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import { EvolutionWhatsappClient } from './evolution.client';
import { EVO_BAILEYS, EVO_CLOUD, evoFailure, noWait } from './evolution.fakes';

// docs/19 «Evolution driver»: Evolution's answers → WaError, and what the sender then does.

const NOW = new Date('2026-11-06T10:00:00Z');
type Reply = Parameters<typeof scriptedFetch>[number];

async function info(reply: Reply, env = EVO_BAILEYS): Promise<WaError['info']> {
  const f = scriptedFetch(reply);
  const opts = { fetch: f.fetch, timeoutMs: 1_000, pacer: noWait() };
  const c = new EvolutionWhatsappClient(env, opts);
  const e = await c.sendText({ to: '+966500000001', text: 'x' }).catch((x: unknown) => x);
  if (!(e instanceof WaError)) throw new Error('expected a WaError');
  return e.info;
}

const plan = (i: WaError['info']) =>
  failurePlan({ error: new WaError('x', i), attempts: 1, now: NOW });

describe('Evolution error mapping', () => {
  it('a refused token (401 / 403) is the line, held uncounted as evolution_auth', async () => {
    for (const status of [401, 403]) {
      const i = await info(evoFailure(status, 'Unauthorized'));
      expect(i.credential).toBe('evolution');
      expect(plan(i)).toMatchObject({ status: 'queued', error_code: 'evolution_auth', attempts: 0 });
    }
  });

  it('an unknown instance (404) or a closed session is held the same way', async () => {
    expect((await info(evoFailure(404, 'The "x" instance does not exist'))).credential).toBe('evolution');
    expect((await info(evoFailure(500, 'Connection Closed'))).credential).toBe('evolution');
  });

  it('a number not on WhatsApp fails at once as 131026', async () => {
    const i = await info(evoFailure(400, [{ exists: false, jid: '966500000001@s.whatsapp.net' }]));
    expect(i.code).toBe(WA_ERROR.undeliverable);
    expect(plan(i)).toMatchObject({ status: 'failed', error_code: '131026' });
  });

  it("a Cloud instance's 24 h refusal reads as Meta's 131047; never on Baileys", async () => {
    const refusal = evoFailure(400, 'Message failed: (#131047) Re-engagement message');
    expect((await info(refusal)).code).toBe(WA_ERROR.invalidParameter);
    const i = await info(refusal, EVO_CLOUD);
    expect(i.code).toBe(WA_ERROR.reEngagement);
    expect(plan(i).error_code).toBe('window_closed');
  });

  it('any other 5xx is uncertain: failed, never resent', async () => {
    const i = await info(evoFailure(500, 'Internal Server Error'));
    expect(i.uncertain).toBe(true);
    expect(plan(i)).toMatchObject({ status: 'failed', error_code: 'uncertain' });
  });

  it('a 429 is retried later; any other 4xx fails at once', async () => {
    expect(plan(await info(evoFailure(429, 'slow down')))).toMatchObject({ status: 'queued' });
    expect(plan(await info(evoFailure(400, 'bad body')))).toMatchObject({ status: 'failed', error_code: '100' });
  });

  it('a connection refused never left: retried; a lost answer is uncertain', async () => {
    const refused = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    expect((await info(refused)).uncertain).toBe(false);
    expect((await info(new TypeError('socket hang up'))).uncertain).toBe(true);
  });

  it('the automatic-sends refusal fails at once with its own code', () => {
    const i = { code: WA_ERROR.invalidParameter, status: 0, blocked: 'evolution_auto_off' as const };
    expect(plan(i)).toMatchObject({ status: 'failed', error_code: 'evolution_auto_off' });
  });
});

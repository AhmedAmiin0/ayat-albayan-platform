import { describe, expect, it } from 'vitest';
import { KAPSO_ENV } from '@/modules/messaging/whatsapp/drivers/kapso/kapso.fakes';
import type { FetchLike } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { failurePlan, UNCERTAIN } from '@/modules/messaging/whatsapp/sender/send-plan';
import { HttpWhatsappClient } from './whatsapp.client';
import type { GraphEnv } from '@/config/env/env';
import { STUB_ENV } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

// docs/36 h8b: a send Meta (or Kapso) may already have is `uncertain`, and failurePlan fails the
// row instead of sending it twice. Fakes only: never Meta, never Kapso.

const NOW = new Date('2026-11-02T12:00:00Z');
const json = (body: unknown): FetchLike => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

/** undici's error for a 3xx under `redirect: 'error'` (no errno on its cause). */
const redirected: FetchLike = () =>
  Promise.reject(new TypeError('fetch failed', { cause: new Error('unexpected redirect') }));

async function sendError(fetch: FetchLike, env: GraphEnv = STUB_ENV): Promise<WaError> {
  const client = new HttpWhatsappClient(env, { fetch });
  const e = await client.sendText({ to: '+966551234567', text: 'x' }).catch((x: unknown) => x);
  if (!(e instanceof WaError)) throw new Error('expected a WaError');
  return e;
}

const NOT_RESENT = { status: 'failed', next_attempt_at: null, error_code: UNCERTAIN };

describe('HttpWhatsappClient send: uncertain failures (h8b)', () => {
  it.each([
    ['no messages', {}],
    ['an empty list', { messages: [] }],
    ['an empty id', { messages: [{ id: '' }] }],
  ])('a 2xx with %s: status 200, uncertain, never resent', async (_name, body) => {
    const e = await sendError(json(body));
    expect(e.message).toBe('Unexpected WhatsApp response');
    expect(e.info).toMatchObject({ code: null, status: 200, uncertain: true });
    expect(failurePlan({ error: e, attempts: 1, now: NOW })).toMatchObject(NOT_RESENT);
  });

  it('a Kapso redirect: a network failure that may have reached it, never resent', async () => {
    const e = await sendError(redirected, KAPSO_ENV);
    expect(e.info).toEqual({ code: null, status: 0, uncertain: true });
    expect(failurePlan({ error: e, attempts: 1, now: NOW })).toMatchObject(NOT_RESENT);
  });

  it('a read (not the send) keeps a 2xx shape failure certain, as before', async () => {
    const client = new HttpWhatsappClient(STUB_ENV, { fetch: json({ data: 'x' }) });
    const e = await client.getTemplates().catch((x: unknown) => x);
    expect((e as WaError).info).toMatchObject({ code: null, status: 200 });
    expect((e as WaError).info.uncertain).toBeUndefined();
  });
});

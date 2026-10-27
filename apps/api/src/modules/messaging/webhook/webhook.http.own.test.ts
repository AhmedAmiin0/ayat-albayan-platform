import { afterEach, describe, expect, it, vi } from 'vitest';
import { OwnNumbers } from '../numbers';
import { envelope, inboundValue, textPart } from './meta.fakes';
import { kapsoSign, sign, webhookApp } from './test-app';

// The academy's own numbers over HTTP (owner 2026-10-27), both drivers: Meta's route and Kapso's.
// Example numbers only. OwnNumbers is the real global provider; only its read is stubbed.

const OWN = '966500000009';

let ctx: Awaited<ReturnType<typeof webhookApp>> | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});

async function app() {
  ctx = await webhookApp();
  vi.spyOn(ctx.app.get(OwnNumbers), 'phones').mockResolvedValue(new Set([`+${OWN}`]));
  return ctx;
}

const body = (from: string, id: string) => JSON.stringify(envelope(inboundValue(textPart('تذكير بالحلقة'), { from, id })));

describe('POST /webhooks/* — a message from one of our own numbers', () => {
  it('Meta: stored already read; no lead, no push', async () => {
    const c = await app();
    const raw = body(OWN, 'wamid.OWN1');
    expect((await c.post(raw, sign(raw))).statusCode).toBe(200);
    expect(c.queries.stored).toEqual([expect.objectContaining({ phone_e164: `+${OWN}`, lead_id: null, read_at: expect.any(String) })]);
    expect(c.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(c.push.notifyAdmins).not.toHaveBeenCalled();
    expect(c.push.notifySales).not.toHaveBeenCalled();
  });

  it('Kapso: the same', async () => {
    const c = await app();
    const raw = body(OWN, 'wamid.OWN2');
    expect((await c.postKapso(raw, { 'x-webhook-signature': kapsoSign(raw) })).statusCode).toBe(200);
    expect(c.queries.stored).toHaveLength(1);
    expect(c.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(c.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('a family on the same app is unchanged', async () => {
    const c = await app();
    const raw = body('966501234567', 'wamid.FAM');
    expect((await c.post(raw, sign(raw))).statusCode).toBe(200);
    expect(c.leads.upsertByPhone).toHaveBeenCalled();
    expect(c.queries.stored[0]).not.toHaveProperty('read_at');
    expect(c.push.notifyAdmins).toHaveBeenCalled();
  });
});

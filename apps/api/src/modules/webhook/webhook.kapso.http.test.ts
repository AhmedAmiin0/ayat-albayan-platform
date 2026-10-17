import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOpenApi } from '../../openapi';
import { envelope, inboundValue, textPart } from './meta.fakes';
import { KAPSO_SECRET, kapsoSign, sign, webhookApp } from './test-app';

// POST /webhooks/kapso (docs/19): Kapso forwards Meta's raw payload; only the Kapso secret signs it.

let ctx: Awaited<ReturnType<typeof webhookApp>> | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
  vi.restoreAllMocks();
});
async function boot(config?: Parameters<typeof webhookApp>[0]) {
  ctx = await webhookApp(config);
  return ctx;
}

const text = JSON.stringify(envelope(inboundValue(textPart('السلام عليكم'))));

describe('POST /webhooks/kapso', () => {
  it('200 and stored through the same handler for Kapso\'s hex signature over the raw bytes', async () => {
    const { postKapso, queries } = await boot();
    const raw = text.replace('{', '{  ');
    expect((await postKapso(raw)).statusCode).toBe(200);
    expect(queries.stored).toEqual([expect.objectContaining({ phone_e164: '+966501234567', body: 'السلام عليكم' })]);
  });

  it('also accepts X-Hub-Signature-256 = «sha256=» + the HMAC with the Kapso secret', async () => {
    const { postKapso, queries } = await boot();
    expect((await postKapso(text, { 'x-hub-signature-256': sign(text, KAPSO_SECRET) })).statusCode).toBe(200);
    expect(queries.stored).toHaveLength(1);
  });

  it('401, nothing stored, and only header NAMES logged (debug, never warn) for a bad, missing or Meta-secret signature', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    const { postKapso, queries, leads } = await boot();
    const bad = kapsoSign(text, 'another-secret');
    expect((await postKapso(text, { 'x-webhook-signature': bad })).statusCode).toBe(401);
    expect((await postKapso(text, {})).statusCode).toBe(401);
    expect((await postKapso(text, { 'x-hub-signature-256': sign(text) })).statusCode).toBe(401);
    expect(queries.stored).toEqual([]);
    expect(leads.upsertByPhone).not.toHaveBeenCalled();
    expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).not.toContain('kapso webhook refused');
    const logged = debug.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('signature headers present: x-webhook-signature');
    expect(logged).toContain('signature headers present: none');
    expect(logged).not.toContain(bad);
    expect(logged).not.toContain(KAPSO_SECRET);
  });

  it('401 when KAPSO_WEBHOOK_SECRET is not set, even with a «valid» empty-secret signature', async () => {
    const { postKapso, queries } = await boot({ kapsoSecret: undefined });
    expect((await postKapso(text)).statusCode).toBe(401);
    expect((await postKapso(text, { 'x-webhook-signature': kapsoSign(text, '') })).statusCode).toBe(401);
    expect(queries.stored).toEqual([]);
  });

  it('the Meta route refuses a body signed with the Kapso secret', async () => {
    const { post, queries } = await boot();
    expect((await post(text, sign(text, KAPSO_SECRET))).statusCode).toBe(401);
    expect(queries.stored).toEqual([]);
  });

  it('is in the OpenAPI document next to the Meta route', async () => {
    const { app } = await boot();
    expect(Object.keys(buildOpenApi(app).paths)).toEqual(expect.arrayContaining(['/webhooks/whatsapp', '/webhooks/kapso']));
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { GUARDIAN_ID, LESSON_ID, nobody, outbound } from './webhook.fakes';
import { buttonPart, envelope, inboundValue, statusValue, textPart } from './meta.fakes';
import { sign, VERIFY, webhookApp } from './test-app';

let ctx: Awaited<ReturnType<typeof webhookApp>> | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});
async function boot(config?: Parameters<typeof webhookApp>[0]) {
  ctx = await webhookApp(config);
  return ctx;
}

const text = JSON.stringify(envelope(inboundValue(textPart('السلام عليكم'))));

describe('GET /webhooks/whatsapp (W1)', () => {
  const url = (token: string) => `/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=1158201444`;

  it('echoes hub.challenge as plain text for the right verify token, no bearer needed', async () => {
    const { app } = await boot();
    const res = await app.inject({ method: 'GET', url: url(VERIFY) });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('1158201444');
    expect(res.headers['content-type']).toMatch(/^text\/plain/);
  });

  it('403 for a wrong token or when no verify token is configured', async () => {
    const { app } = await boot();
    expect((await app.inject({ method: 'GET', url: url('wrong') })).statusCode).toBe(403);
    await app.close();
    const bare = await boot({ verifyToken: undefined });
    expect((await bare.app.inject({ method: 'GET', url: url(VERIFY) })).statusCode).toBe(403);
  });
});

describe('POST /webhooks/whatsapp (W2) — signature', () => {
  it('200 and processed when X-Hub-Signature-256 matches the raw bytes', async () => {
    const { post, queries, push } = await boot();
    // Odd spacing: only a check over the raw bytes (not re-serialised JSON) accepts this.
    const raw = text.replace('{', '{  ');
    expect((await post(raw)).statusCode).toBe(200);
    expect(queries.stored).toEqual([expect.objectContaining({ phone_e164: '+966501234567', body: 'السلام عليكم' })]);
    expect(push.notifyAdmins).toHaveBeenCalledWith('new_lead', expect.anything());
  });

  it('401 and nothing stored for a wrong, missing or malformed signature', async () => {
    const { post, queries, leads } = await boot();
    expect((await post(text, sign(text, 'another-secret'))).statusCode).toBe(401);
    expect((await post(text, null)).statusCode).toBe(401);
    expect((await post(text, 'sha256=')).statusCode).toBe(401);
    expect((await post(`${text} `, sign(text))).statusCode).toBe(401);
    expect(queries.stored).toEqual([]);
    expect(leads.upsertByPhone).not.toHaveBeenCalled();
  });

  it('401 when no app secret is configured', async () => {
    const { post } = await boot({ appSecrets: [] });
    expect((await post(text)).statusCode).toBe(401);
  });

  it('200 for a signed body we cannot read (Meta must not retry it)', async () => {
    const { post, queries } = await boot();
    expect((await post(JSON.stringify({ hello: 'world' }))).statusCode).toBe(200);
    expect(queries.stored).toEqual([]);
  });
});

describe('POST /webhooks/whatsapp (W2) — entries', () => {
  it('a replayed delivery is stored, confirmed and pushed once', async () => {
    const { post, queries, lessons, push } = await boot();
    queries.identify.mockResolvedValue({ ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } });
    const body = JSON.stringify(envelope(inboundValue(buttonPart('تمام، هنحضر', `confirm:${LESSON_ID}`))));
    expect((await post(body)).statusCode).toBe(200);
    expect((await post(body)).statusCode).toBe(200);
    expect(queries.stored).toHaveLength(1);
    expect(lessons.confirm).toHaveBeenCalledTimes(1);
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('a status updates the outbound row by wamid', async () => {
    const { post, queries } = await boot();
    queries.outboundByWaId.mockResolvedValue(outbound());
    expect((await post(JSON.stringify(envelope(statusValue({ status: 'delivered' }))))).statusCode).toBe(200);
    expect(queries.moveStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'msg-out-1', patch: expect.objectContaining({ status: 'delivered' }) }),
    );
  });

  it('500 when processing an item fails, so Meta re-sends; the replay then goes through once', async () => {
    const { post, queries } = await boot();
    queries.identify.mockRejectedValueOnce(new Error('db down'));
    expect((await post(text)).statusCode).toBe(500);
    expect(queries.stored).toHaveLength(0);
    expect((await post(text)).statusCode).toBe(200);
    expect((await post(text)).statusCode).toBe(200);
    expect(queries.stored).toHaveLength(1);
  });

  it('500 when the «نعم» confirm fails after the row was stored; the re-send confirms it', async () => {
    const { post, queries, lessons } = await boot();
    queries.identify.mockResolvedValue({ ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } });
    lessons.confirm.mockRejectedValueOnce(new Error('db down'));
    const body = JSON.stringify(envelope(inboundValue(buttonPart('تمام، هنحضر', `confirm:${LESSON_ID}`))));
    expect((await post(body)).statusCode).toBe(500);
    expect(queries.stored).toHaveLength(0);
    expect((await post(body)).statusCode).toBe(200);
    expect(lessons.confirm).toHaveBeenCalledTimes(2);
    expect(queries.stored).toHaveLength(1);
  });
});

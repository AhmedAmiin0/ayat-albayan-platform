import { afterEach, describe, expect, it } from 'vitest';
import { outbound } from './webhook.fakes';
import { wacrmSign, webhookApp } from './test-app';

// POST /webhooks/wacrm (docs/19 «crm driver»): signed + fresh, deduped on the delivery id; ticks only.

let ctx: Awaited<ReturnType<typeof webhookApp>> | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});

const delivery = (id: string, status = 'delivered') =>
  JSON.stringify({ id, event: 'message.status_updated', occurred_at: '2026-10-25T08:00:00.000Z', account_id: 'acct', data: { whatsapp_message_id: 'wamid.crm-1', conversation_id: 'crm-conv', status } });

describe('POST /webhooks/wacrm', () => {
  it('message.status_updated moves our row by its wamid (the delivery-status path); the CRM conversation id is not stored', async () => {
    ctx = await webhookApp();
    ctx.queries.outboundByWaId.mockResolvedValue(outbound({ status: 'sent' }));
    expect((await ctx.postWacrm(delivery('d-1'))).statusCode).toBe(200);
    expect(ctx.queries.outboundByWaId).toHaveBeenCalledWith('wamid.crm-1');
    const [[move]] = ctx.queries.moveStatus.mock.calls as [[{ patch: Record<string, unknown> }]];
    expect(move.patch).toMatchObject({ status: 'delivered' });
    expect(move.patch).not.toHaveProperty('wa_conversation_id');
  });

  it('a duplicate delivery id is a no-op 200', async () => {
    ctx = await webhookApp();
    ctx.queries.outboundByWaId.mockResolvedValue(outbound({ status: 'sent' }));
    await ctx.postWacrm(delivery('d-2'));
    expect((await ctx.postWacrm(delivery('d-2', 'read'))).statusCode).toBe(200);
    expect(ctx.queries.outboundByWaId).toHaveBeenCalledTimes(1);
  });

  it('401 for a bad, missing or stale signature, and while WACRM_WEBHOOK_SECRET is unset; nothing read', async () => {
    ctx = await webhookApp();
    const body = delivery('d-3');
    expect((await ctx.postWacrm(body, wacrmSign(body, { secret: 'other' }))).statusCode).toBe(401);
    expect((await ctx.postWacrm(body, null)).statusCode).toBe(401);
    expect((await ctx.postWacrm(body, wacrmSign(body, { t: Math.floor(Date.now() / 1000) - 600 }))).statusCode).toBe(401);
    await ctx.app.close();
    ctx = await webhookApp({ wacrmSecret: undefined });
    expect((await ctx.postWacrm(body)).statusCode).toBe(401);
    expect(ctx.queries.outboundByWaId).not.toHaveBeenCalled();
  });

  it('message.received is logged only (the CRM owns that conversation): 200, nothing stored or sent', async () => {
    ctx = await webhookApp();
    const body = JSON.stringify({ id: 'd-4', event: 'message.received', occurred_at: '2026-10-25T08:00:00.000Z', account_id: 'a', data: { text: 'x' } });
    expect((await ctx.postWacrm(body)).statusCode).toBe(200);
    expect(ctx.queries.stored).toEqual([]);
    expect(ctx.queries.outboundByWaId).not.toHaveBeenCalled();
  });

  it('a failed status write answers 500 and the same delivery may come again', async () => {
    ctx = await webhookApp();
    ctx.queries.outboundByWaId.mockRejectedValueOnce(new Error('db down')).mockResolvedValue(outbound({ status: 'sent' }));
    expect((await ctx.postWacrm(delivery('d-5'))).statusCode).toBe(500);
    expect((await ctx.postWacrm(delivery('d-5'))).statusCode).toBe(200);
    expect(ctx.queries.moveStatus).toHaveBeenCalledTimes(1);
  });
});

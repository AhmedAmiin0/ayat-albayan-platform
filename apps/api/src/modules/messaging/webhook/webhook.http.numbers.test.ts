import { afterEach, describe, expect, it } from 'vitest';
import type { OverlayNumber } from '../../../common/integrations/numbers-overlay';
import { envelope, inboundValue, PHONE_NUMBER_ID, textPart } from './meta.fakes';
import { sign, webhookApp } from './test-app';

// Module mode over HTTP (docs/23c decision 7): the stored inbound row carries number_id + line = purpose.

let ctx: Awaited<ReturnType<typeof webhookApp>> | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});

const row = (over: Partial<OverlayNumber>): OverlayNumber => ({
  id: 'n',
  label: 'x',
  purpose: 'chat',
  phone_number_id: 'p',
  waba_id: null,
  enabled: true,
  is_default: false,
  fallback_rank: 100,
  created_at: '2026-10-01T00:00:00Z',
  env: null,
  appSecret: null,
  ...over,
});
const SALES2 = row({ id: 'num-sales-2', phone_number_id: 'pid-sales-2', appSecret: 'sales2-secret-fake' });
const OFF = row({ id: 'num-off', purpose: 'notifications', phone_number_id: 'pid-off', enabled: false });
const NUMBER_SECRET = 'sales2-secret-fake';

const body = (pid: string, id: string) => JSON.stringify(envelope(inboundValue(textPart('السلام عليكم'), { id }), pid));

describe('POST /webhooks/whatsapp — module mode', () => {
  it('a non-default number (signed with its own secret) and a disabled one stamp number_id + line', async () => {
    ctx = await webhookApp({ appSecrets: [NUMBER_SECRET], overlay: [SALES2, OFF] });
    const a = body('pid-sales-2', 'wamid.A');
    const b = body('pid-off', 'wamid.B');
    expect((await ctx.post(a, sign(a, NUMBER_SECRET))).statusCode).toBe(200);
    expect((await ctx.post(b, sign(b, NUMBER_SECRET))).statusCode).toBe(200);
    expect(ctx.queries.stored.map((r) => [r.wa_message_id, r.number_id, r.line])).toEqual([
      ['wamid.A', 'num-sales-2', 'chat'],
      ['wamid.B', 'num-off', 'notifications'],
    ]);
  });

  it('an unknown phone_number_id (even a legacy line id) is ignored: 200, nothing stored', async () => {
    ctx = await webhookApp({ appSecrets: [NUMBER_SECRET], overlay: [SALES2] });
    const raw = body(PHONE_NUMBER_ID, 'wamid.X');
    expect((await ctx.post(raw, sign(raw, NUMBER_SECRET))).statusCode).toBe(200);
    expect(ctx.queries.stored).toEqual([]);
    expect(ctx.leads.upsertByPhone).not.toHaveBeenCalled();
  });

  it('legacy (no overlay): the row carries no number_id key', async () => {
    ctx = await webhookApp({});
    const raw = body(PHONE_NUMBER_ID, 'wamid.L');
    expect((await ctx.post(raw, sign(raw))).statusCode).toBe(200);
    expect(ctx.queries.stored).toHaveLength(1);
    expect(ctx.queries.stored[0]).not.toHaveProperty('number_id');
  });
});

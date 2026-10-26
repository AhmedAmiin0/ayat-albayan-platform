import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../../../config/env/env';
import { CHAT_PHONE_NUMBER_ID, envelope, inboundValue, PHONE_NUMBER_ID, textPart } from './meta.fakes';
import { CHAT_SECRET, SECRET, sign, webhookApp } from './test-app';
import { webhookConfig } from './webhook.config';

// Two WhatsApp lines over HTTP (docs/12 §13.6, R-MSG-04, R-LEAD-01).

let ctx: Awaited<ReturnType<typeof webhookApp>> | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});
const TWO = { appSecrets: [SECRET, CHAT_SECRET], numbers: { notifications: PHONE_NUMBER_ID, chat: CHAT_PHONE_NUMBER_ID } };
async function boot(config: Parameters<typeof webhookApp>[0] = TWO) {
  ctx = await webhookApp(config);
  return ctx;
}

const body = (phoneNumberId: string, id = 'wamid.IN1') =>
  JSON.stringify(envelope(inboundValue(textPart('السلام عليكم'), { id }), phoneNumberId));

describe('POST /webhooks/whatsapp — two lines', () => {
  it('200 and stored with line chat when signed with the chat secret', async () => {
    const { post, queries } = await boot();
    const raw = body(CHAT_PHONE_NUMBER_ID);
    expect((await post(raw, sign(raw, CHAT_SECRET))).statusCode).toBe(200);
    expect(queries.stored).toEqual([expect.objectContaining({ wa_message_id: 'wamid.IN1', line: 'chat' })]);
  });

  it('401 and nothing stored for a third secret', async () => {
    const { post, queries } = await boot();
    const raw = body(CHAT_PHONE_NUMBER_ID);
    expect((await post(raw, sign(raw, 'a-third-secret'))).statusCode).toBe(401);
    expect(queries.stored).toEqual([]);
  });

  it('stamps each envelope with its receiving line', async () => {
    const { post, queries } = await boot();
    expect((await post(body(CHAT_PHONE_NUMBER_ID, 'wamid.CHAT'))).statusCode).toBe(200);
    expect((await post(body(PHONE_NUMBER_ID, 'wamid.NOTIF'))).statusCode).toBe(200);
    expect(queries.stored.map((r) => [r.wa_message_id, r.line])).toEqual([
      ['wamid.CHAT', 'chat'],
      ['wamid.NOTIF', 'notifications'],
    ]);
  });

  it('200 and nothing stored for a phone number id that is neither line', async () => {
    const { post, queries, leads } = await boot();
    expect((await post(body('someone-else'))).statusCode).toBe(200);
    expect(queries.stored).toEqual([]);
    expect(leads.upsertByPhone).not.toHaveBeenCalled();
  });

  it('the same wamid replayed on either line is stored once', async () => {
    const { post, queries, push } = await boot();
    expect((await post(body(CHAT_PHONE_NUMBER_ID))).statusCode).toBe(200);
    expect((await post(body(PHONE_NUMBER_ID))).statusCode).toBe(200);
    expect((await post(body(CHAT_PHONE_NUMBER_ID))).statusCode).toBe(200);
    expect(queries.stored).toHaveLength(1);
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('chat unset: the stored row carries NO line key', async () => {
    const { post, queries } = await boot({});
    expect((await post(body(PHONE_NUMBER_ID))).statusCode).toBe(200);
    expect(queries.stored).toHaveLength(1);
    expect(queries.stored[0]).not.toHaveProperty('line');
  });

  it('an incomplete chat env (only WA_CHAT_PHONE_NUMBER_ID) still stores the chat line', async () => {
    const env = loadEnv({
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      WA_APP_SECRET: SECRET,
      WA_PHONE_NUMBER_ID: PHONE_NUMBER_ID,
      WA_CHAT_PHONE_NUMBER_ID: CHAT_PHONE_NUMBER_ID,
    });
    const { post, queries } = await boot(webhookConfig(env));
    expect((await post(body(CHAT_PHONE_NUMBER_ID))).statusCode).toBe(200);
    expect(queries.stored).toEqual([expect.objectContaining({ line: 'chat' })]);
  });
});

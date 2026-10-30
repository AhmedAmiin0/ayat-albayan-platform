import { describe, expect, it } from 'vitest';
import { KAPSO_ENV } from '../../drivers/kapso/kapso.fakes';
import { failurePlan } from '../send-plan';
import { HttpWhatsappClient } from '../../whatsapp.client';
import { RECORDED, scriptedFetch, STUB_ENV, type Recorded } from '../../whatsapp.fakes';
import { WaError } from '../../whatsapp.types';

// No double send: Meta's 131042 is an HTTP 4xx error body with no `messages[].id`, so the client
// throws and nothing was accepted; any 2xx with a wamid resolves as sent and is never held.

const NOW = new Date('2026-10-30T08:00:00Z');
const PAYMENT: Recorded = {
  status: 400,
  body: {
    error: {
      message: '(#131042) Business eligibility payment issue',
      type: 'OAuthException',
      code: 131042,
      error_data: {
        messaging_product: 'whatsapp',
        details:
          'Message failed to send because there were one or more errors related to your payment method.',
      },
      fbtrace_id: 'x',
    },
  },
};
const send = (env: typeof STUB_ENV | typeof KAPSO_ENV, reply: Recorded) =>
  new HttpWhatsappClient(env, { fetch: scriptedFetch(reply).fetch, timeoutMs: 1_000 }).sendText({
    to: '+966551234567',
    text: 'أهلًا',
  });

describe('131042 response shape', () => {
  it.each([
    { driver: 'meta', env: STUB_ENV },
    { driver: 'kapso', env: KAPSO_ENV },
  ])(
    '$driver: the 131042 body throws WaError 131042 (no wamid) and the row is held',
    async ({ env }) => {
      const error = await send(env, PAYMENT).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(WaError);
      expect(error).toMatchObject({ info: { code: 131042, status: 400 } });
      expect(failurePlan({ error, attempts: 1, now: NOW })).toMatchObject({
        status: 'queued',
        error_code: 'wa_payment_hold',
      });
    },
  );

  it('a 2xx with a wamid is a success, whatever else it carries', async () => {
    await expect(send(STUB_ENV, RECORDED.sendOk)).resolves.toEqual({
      waMessageId: 'wamid.d75640b5-fa48-4b20-bf51-8b9093173f42',
    });
  });
});

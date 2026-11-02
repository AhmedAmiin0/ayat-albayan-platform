import { describe, expect, it } from 'vitest';
import { failurePlan, UNCERTAIN } from '@/modules/messaging/whatsapp/sender/send-plan';
import { HttpWhatsappClient } from './whatsapp.client';
import { STUB_ENV } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

// docs/36 h8 (review A #4): a POST /messages that got its 2xx headers and then lost its body has
// reached Meta. It is `uncertain`, so the sender fails the row instead of sending it twice.

/** A 200 whose body stream breaks after the headers arrived. */
const brokenBody = (): Promise<Response> => {
  const body = new ReadableStream<Uint8Array>({
    pull: (controller) => {
      controller.error(new Error('socket closed'));
    },
  });
  return Promise.resolve(new Response(body, { status: 200 }));
};

describe('HttpWhatsappClient: a 2xx whose body read fails', () => {
  it('is uncertain, and failurePlan never resends it', async () => {
    const client = new HttpWhatsappClient(STUB_ENV, { fetch: brokenBody });
    const e = await client.sendText({ to: '+966551234567', text: 'x' }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(WaError);
    expect((e as WaError).info).toEqual({ code: null, status: 0, uncertain: true });
    const now = new Date('2026-11-02T12:00:00Z');
    const plan = failurePlan({ error: e, attempts: 1, now });
    expect(plan).toMatchObject({ status: 'failed', next_attempt_at: null, error_code: UNCERTAIN });
  });
});

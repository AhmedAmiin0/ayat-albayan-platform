// Stripe event payloads of the webhook tests (test-only). Shapes as the API version 2026-09-30.endive sends them.
import { LINK_ID, SESSION } from './stripe-mocks.fakes';

export const CREATED = 1_793_000_000; // 2026-10-26

export function sessionEvent(type: string, patch: Record<string, unknown> = {}, id = 'evt_1') {
  return {
    id,
    object: 'event',
    type,
    created: CREATED,
    livemode: false,
    data: {
      object: {
        id: SESSION,
        object: 'checkout.session',
        client_reference_id: LINK_ID,
        metadata: { payment_link_id: LINK_ID },
        amount_total: 12000,
        currency: 'sar',
        payment_status: 'paid',
        payment_intent: 'pi_1',
        status: 'complete',
        ...patch,
      },
    },
  };
}

export function chargeEvent(type: string, object: Record<string, unknown>, id = 'evt_9') {
  return { id, object: 'event', type, created: CREATED, livemode: false, data: { object } };
}

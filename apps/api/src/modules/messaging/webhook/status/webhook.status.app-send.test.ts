import { describe, expect, it } from 'vitest';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { statusPatch } from './webhook.status';

// After the attach (docs/19) WhatsApp's statuses move the row forward only, like any other.

const at = new Date('2026-11-06T10:07:00Z');
const event = (status: StatusEvent['status']): StatusEvent => ({
  waMessageId: 'wamid.APP1',
  status,
  at,
  errorCode: null,
  errorText: null,
  conversationId: null,
  pricingCategory: null,
});
const attached = { status: 'sent' as const, sent_at: '2026-11-06T10:05:00Z', delivered_at: null, read_at: null };

describe('statusPatch after an app send attach', () => {
  it('delivered then read', () => {
    expect(statusPatch(attached, event('delivered'))).toMatchObject({ status: 'delivered' });
    expect(statusPatch({ ...attached, status: 'delivered' }, event('read'))).toMatchObject({ status: 'read' });
  });

  it('attached from a delivered status: a late «sent» changes nothing', () => {
    expect(statusPatch({ ...attached, status: 'delivered' }, event('sent'))).toBeNull();
  });
});

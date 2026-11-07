import { describe, expect, it } from 'vitest';
import { PUSH_WAKE_KINDS, wakesInbox } from './push-wake.js';

describe('wakesInbox (docs/43 §5)', () => {
  it('only the inbox kinds wake the app', () => {
    expect(PUSH_WAKE_KINDS).toEqual(['new_message', 'new_lead']);
    expect([wakesInbox('new_message'), wakesInbox('new_lead')]).toEqual([true, true]);
  });

  it('any other kind, or none, does not', () => {
    expect([wakesInbox('payment_due'), wakesInbox('channel_message')]).toEqual([false, false]);
    expect([wakesInbox(undefined), wakesInbox('')]).toEqual([false, false]);
  });
});

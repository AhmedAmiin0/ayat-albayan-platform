import { describe, expect, it } from 'vitest';
import { APP_SEND_UNCONFIRMED, isHoldFailure } from '../chat/thread-reopen.js';
import { canRetryCode } from '../wa.js';
import { appSendUnconfirmed, canSendViaWhatsApp } from './whatsapp-send.js';

const text = {
  direction: 'outbound' as const,
  status: 'queued' as const,
  error_code: 'awaiting_reply' as string | null,
  body: 'السلام عليكم',
  template_key: null as string | null,
  media_mime: null as string | null,
};

describe('canSendViaWhatsApp: the chat line only (echoes come back on it alone)', () => {
  it.each([
    ['chat', 'chat' as const],
    ['never routed (null)', null],
    ['an old cache (absent)', undefined],
  ])('%s: shown', (_name, line) => {
    expect(canSendViaWhatsApp({ ...text, line })).toBe(true);
  });

  it.each(['notifications', 'calls'] as const)('%s: not shown', (line) => {
    expect(canSendViaWhatsApp({ ...text, line })).toBe(false);
  });
});

describe('app_send_unconfirmed: the tap passed with no echo', () => {
  const unconfirmed = { ...text, status: 'failed' as const, error_code: APP_SEND_UNCONFIRMED };

  it('keeps «أرسل عبر واتساب» (send it again from the app)', () => {
    expect(canSendViaWhatsApp(unconfirmed)).toBe(true);
  });

  it('asks «هل أرسلتها من واتساب؟» on that failed row only', () => {
    expect(appSendUnconfirmed(unconfirmed)).toBe(true);
    expect(appSendUnconfirmed({ status: 'queued', error_code: APP_SEND_UNCONFIRMED })).toBe(false);
    expect(appSendUnconfirmed({ status: 'failed', error_code: 'reopen_failed' })).toBe(false);
  });

  it('«لا» holds it again (a hold failure); the plain retry button never shows', () => {
    expect(isHoldFailure(APP_SEND_UNCONFIRMED)).toBe(true);
    expect(canRetryCode(APP_SEND_UNCONFIRMED)).toBe(false);
  });
});

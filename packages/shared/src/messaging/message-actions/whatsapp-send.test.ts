import { describe, expect, it } from 'vitest';
import {
  APP_SEND_GRACE_MS,
  APP_SEND_MS,
  appSendPending,
  appSendRefusal,
  canSendViaWhatsApp,
  stoppedByWindow,
} from './whatsapp-send.js';

const text = {
  direction: 'outbound' as const,
  status: 'queued' as const,
  error_code: 'awaiting_reply' as string | null,
  body: 'السلام عليكم',
  template_key: null as string | null,
  media_mime: null as string | null,
};

describe('canSendViaWhatsApp: only a staff text the 24 h window stopped', () => {
  it('a held text (queued awaiting_reply)', () => {
    expect(canSendViaWhatsApp(text)).toBe(true);
  });

  it.each([
    'reopen_unavailable',
    'reopen_failed',
    'reopen_tries_used',
    'hold_expired',
    'window_closed',
    '131047',
    '470',
  ])('failed %s: shown', (code) => {
    expect(canSendViaWhatsApp({ ...text, status: 'failed', error_code: code })).toBe(true);
  });

  it.each(['network', '131026', 'handed_off', 'uncertain', null])('failed %s: not shown', (code) => {
    expect(canSendViaWhatsApp({ ...text, status: 'failed', error_code: code })).toBe(false);
  });

  it('queued for another reason (sending, a retry, no code): not shown', () => {
    for (const code of ['sending', 'network', null]) {
      expect(canSendViaWhatsApp({ ...text, error_code: code })).toBe(false);
    }
  });

  it('a file, a template, an empty body or an inbound row: not shown', () => {
    expect(canSendViaWhatsApp({ ...text, media_mime: 'image/jpeg' })).toBe(false);
    expect(canSendViaWhatsApp({ ...text, template_key: 'welcome_greeting' })).toBe(false);
    expect(canSendViaWhatsApp({ ...text, body: '   ' })).toBe(false);
    expect(canSendViaWhatsApp({ ...text, direction: 'inbound' })).toBe(false);
  });

  it('sent, delivered or already sent by hand: not shown', () => {
    for (const status of ['sent', 'delivered', 'read', 'sent_manually'] as const) {
      expect(stoppedByWindow({ status, error_code: 'awaiting_reply' })).toBe(false);
    }
  });
});

describe('appSendPending: the tap keeps the platform off the row until app_send_until', () => {
  const now = new Date('2026-11-06T10:00:00Z');
  it('pending only while the instant is ahead', () => {
    expect(appSendPending({ app_send_until: '2026-11-06T10:05:00Z' }, now)).toBe(true);
    expect(appSendPending({ app_send_until: '2026-11-06T10:00:00Z' }, now)).toBe(false);
    expect(appSendPending({ app_send_until: null }, now)).toBe(false);
    expect(appSendPending({}, now)).toBe(false);
  });

  it('one tap is 10 minutes; an echo still attaches 5 minutes after', () => {
    expect(APP_SEND_MS).toBe(600_000);
    expect(APP_SEND_GRACE_MS).toBe(300_000);
  });
});

describe('appSendRefusal: the 409 says what the row is now', () => {
  const body = (status: string, error_code: string | null = null) =>
    ({ code: 'not_app_send', status, error_code });

  it('claimed by the sender: sending', () => {
    expect(appSendRefusal(body('queued', 'sending'))).toBe('sending');
  });

  it.each(['sent', 'delivered', 'read', 'sent_manually'])('%s: sent already', (status) => {
    expect(appSendRefusal(body(status))).toBe('sent');
  });

  it('anything else (queued for another reason, failed otherwise): other', () => {
    expect(appSendRefusal(body('queued', null))).toBe('other');
    expect(appSendRefusal(body('failed', 'network'))).toBe('other');
  });

  it('not a refusal body: null', () => {
    expect(appSendRefusal({ code: 'not_manual', status: 'sent' })).toBeNull();
    expect(appSendRefusal(null)).toBeNull();
  });
});

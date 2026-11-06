import { describe, expect, it } from 'vitest';
import { canSendViaWhatsApp, stoppedByWindow } from './whatsapp-send.js';

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

import { describe, expect, it } from 'vitest';
import {
  APP_SEND_ANSWER_ACTIONS,
  APP_SEND_ANSWER_KEYS,
  APP_SEND_ANSWERS,
  appSendLineOf,
} from './app-send-answers.js';

const NOW = new Date('2026-11-06T12:00:00Z');
const held = { status: 'queued' as const, error_code: 'awaiting_reply', app_send_until: null };
const unconfirmed = { status: 'failed' as const, error_code: 'app_send_unconfirmed' };

describe('appSendLineOf', () => {
  it('the offer before any tap, or once a window and its 15 min grace passed', () => {
    expect(appSendLineOf(held, NOW)).toBe('offer');
    expect(appSendLineOf({ ...held, app_send_until: '2026-11-06T11:44:00Z' }, NOW)).toBe('offer');
  });

  it('still pending in the grace (the platform waits; «أرسلتها» stays)', () => {
    expect(appSendLineOf({ ...held, app_send_until: '2026-11-06T11:50:00Z' }, NOW)).toBe('pending');
  });

  it('pending while the window is open, even on an unconfirmed row tapped again', () => {
    const until = '2026-11-06T12:05:00Z';
    expect(appSendLineOf({ ...held, app_send_until: until }, NOW)).toBe('pending');
    expect(appSendLineOf({ ...unconfirmed, app_send_until: until }, NOW)).toBe('pending');
  });

  it('the question on an unconfirmed row', () => {
    expect(appSendLineOf({ ...unconfirmed, app_send_until: '2026-11-06T11:00:00Z' }, NOW)).toBe(
      'unconfirmed',
    );
  });
});

describe('the answers', () => {
  it('none on the offer; «أرسلتها» pending; only «نعم» unconfirmed (never put back)', () => {
    expect(APP_SEND_ANSWERS).toEqual({
      offer: [],
      pending: ['sentIt'],
      unconfirmed: ['yes'],
    });
  });

  it('yes and «أرسلتها» stop the platform (sent-manually); no retry answer', () => {
    expect(APP_SEND_ANSWER_ACTIONS).toEqual({
      sentIt: 'sent-manually',
      yes: 'sent-manually',
    });
    expect(APP_SEND_ANSWER_KEYS).toEqual({ sentIt: 'sentIt', yes: 'yes' });
  });
});

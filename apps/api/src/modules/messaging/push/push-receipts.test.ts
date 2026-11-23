import { describe, expect, it } from 'vitest';
import { deadToken, readReceipts, type ExpoReceipt } from './push-receipts';

const gone = (over: Partial<Extract<ExpoReceipt, { status: 'error' }>> = {}): ExpoReceipt => ({
  status: 'error',
  message: '"ExponentPushToken[old-1]" is not a registered push notification recipient',
  details: { error: 'DeviceNotRegistered' },
  ...over,
});

/** What Expo returned for a device FCM dropped (2026-11-19..22): no token anywhere in it. */
const FCM_GONE: ExpoReceipt = {
  status: 'error',
  message: 'The recipient device is not registered with FCM.',
  details: { error: 'DeviceNotRegistered' },
};
const PHONE = 'ExponentPushToken[phone-1]';

describe('deadToken (DeviceNotRegistered receipts)', () => {
  it('the token the ticket was sent to first', () => {
    expect(deadToken(FCM_GONE, PHONE)).toBe(PHONE);
    expect(deadToken(gone(), PHONE)).toBe(PHONE);
  });

  it('no map: details.expoPushToken, else the token Expo quotes in the message', () => {
    const details = { error: 'DeviceNotRegistered', expoPushToken: 'ExponentPushToken[x-2]' };
    expect(deadToken(gone({ details }))).toBe('ExponentPushToken[x-2]');
    expect(deadToken(gone())).toBe('ExponentPushToken[old-1]');
  });

  it('no token known, another error, or ok → null', () => {
    expect(deadToken(FCM_GONE)).toBeNull();
    expect(deadToken(gone({ details: { error: 'MessageRateExceeded' } }), PHONE)).toBeNull();
    expect(deadToken({ status: 'ok' }, PHONE)).toBeNull();
  });
});

describe('readReceipts', () => {
  const sentTo = { a: 'ExponentPushToken[a]', b: 'ExponentPushToken[b]' };

  it('missing receipts stay pending with their tokens; ok receipts prune nothing', () => {
    expect(readReceipts(['a', 'b'], { a: { status: 'ok' } }, sentTo)).toEqual({
      pending: ['b'],
      pendingTokens: { b: 'ExponentPushToken[b]' },
      deadTokens: [],
      error: null,
    });
  });

  it('an FCM DeviceNotRegistered receipt (no token in it) prunes the token its ticket went to', () => {
    expect(readReceipts(['a', 'b'], { a: FCM_GONE, b: { status: 'ok' } }, sentTo)).toEqual({
      pending: [],
      pendingTokens: {},
      deadTokens: ['ExponentPushToken[a]'],
      error: 'The recipient device is not registered with FCM.',
    });
  });

  it('a row sent before ticket_tokens existed: nothing pruned, nothing thrown', () => {
    const outcome = readReceipts(['a'], { a: FCM_GONE }, {});
    expect(outcome).toEqual({
      pending: [],
      pendingTokens: {},
      deadTokens: [],
      error: 'The recipient device is not registered with FCM.',
    });
  });

  it('collects dead tokens once and the first error', () => {
    const outcome = readReceipts(
      ['a', 'b', 'c'],
      {
        a: gone(),
        b: gone(),
        c: { status: 'error', message: 'too big', details: { error: 'MessageTooBig' } },
      },
      {},
    );
    expect(outcome).toEqual({
      pending: [],
      pendingTokens: {},
      deadTokens: ['ExponentPushToken[old-1]'],
      error: '"ExponentPushToken[old-1]" is not a registered push notification recipient',
    });
  });

  it('an error without a message still records something', () => {
    const provider: ExpoReceipt = { status: 'error', details: { error: 'ProviderError' } };
    expect(readReceipts(['a'], { a: provider }, {}).error).toBe('ProviderError');
    expect(readReceipts(['a'], { a: { status: 'error' } }, {}).error).toBe('error');
  });
});

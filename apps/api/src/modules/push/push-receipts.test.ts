import { describe, expect, it } from 'vitest';
import { deadToken, readReceipts, type ExpoReceipt } from './push-receipts';

const gone = (over: Partial<Extract<ExpoReceipt, { status: 'error' }>> = {}): ExpoReceipt => ({
  status: 'error',
  message: '"ExponentPushToken[old-1]" is not a registered push notification recipient',
  details: { error: 'DeviceNotRegistered' },
  ...over,
});

describe('deadToken (DeviceNotRegistered receipts)', () => {
  it('details.expoPushToken first', () => {
    expect(deadToken(gone({ details: { error: 'DeviceNotRegistered', expoPushToken: 'ExponentPushToken[x-2]' } }))).toBe(
      'ExponentPushToken[x-2]',
    );
  });

  it('else the token Expo quotes in the message', () => {
    expect(deadToken(gone())).toBe('ExponentPushToken[old-1]');
  });

  it('no token named, another error, or ok → null', () => {
    expect(deadToken(gone({ message: 'device gone' }))).toBeNull();
    expect(deadToken(gone({ details: { error: 'MessageRateExceeded' } }))).toBeNull();
    expect(deadToken({ status: 'ok' })).toBeNull();
  });
});

describe('readReceipts', () => {
  it('missing receipts stay pending; ok receipts are done', () => {
    expect(readReceipts(['a', 'b'], { a: { status: 'ok' } })).toEqual({ pending: ['b'], deadTokens: [], error: null });
  });

  it('collects dead tokens once and the first error', () => {
    const outcome = readReceipts(['a', 'b', 'c'], {
      a: gone(),
      b: gone(),
      c: { status: 'error', message: 'too big', details: { error: 'MessageTooBig' } },
    });
    expect(outcome).toEqual({
      pending: [],
      deadTokens: ['ExponentPushToken[old-1]'],
      error: '"ExponentPushToken[old-1]" is not a registered push notification recipient',
    });
  });

  it('an error without a message still records something', () => {
    expect(readReceipts(['a'], { a: { status: 'error', details: { error: 'ProviderError' } } }).error).toBe('ProviderError');
    expect(readReceipts(['a'], { a: { status: 'error' } }).error).toBe('error');
  });
});

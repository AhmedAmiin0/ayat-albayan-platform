import { describe, expect, it } from 'vitest';
import { isUnavailableMessage } from './unavailable.js';

const unsupported = (errors: unknown) => ({ type: 'unsupported', errors, unsupported: { type: 'unknown' } });

describe('isUnavailableMessage', () => {
  it('is Meta’s 131060 on an unsupported message (the code as a number or as text)', () => {
    expect(isUnavailableMessage(unsupported([{ code: 131060, title: 'This message is unavailable' }]))).toBe(true);
    expect(isUnavailableMessage(unsupported([{ code: '131060' }]))).toBe(true);
  });

  it('is false for another error, no errors, another type or no payload', () => {
    expect(isUnavailableMessage(unsupported([{ code: 131051 }]))).toBe(false);
    expect(isUnavailableMessage(unsupported([]))).toBe(false);
    expect(isUnavailableMessage(unsupported(undefined))).toBe(false);
    expect(isUnavailableMessage({ type: 'reaction', errors: [{ code: 131060 }] })).toBe(false);
    expect(isUnavailableMessage(null)).toBe(false);
    expect(isUnavailableMessage('unsupported')).toBe(false);
  });
});

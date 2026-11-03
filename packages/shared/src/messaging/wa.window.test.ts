import { describe, expect, it } from 'vitest';
import { canRetryCode, isRetryableWaError, isWaWindowClosed } from './wa.js';

// Owner 2026-11-03: the 24 h window refusal is never retried; only a template reopens it.

describe('isWaWindowClosed', () => {
  it('131047 and 470 are the window; others are not', () => {
    expect(isWaWindowClosed(131047)).toBe(true);
    expect(isWaWindowClosed(470)).toBe(true);
    for (const code of [131026, 130429, null, undefined])
      expect(isWaWindowClosed(code)).toBe(false);
    expect(isRetryableWaError(131047)).toBe(false);
  });

  it('a window_closed failure offers no «retry» (a template is needed)', () => {
    expect(canRetryCode('window_closed')).toBe(false);
    expect(canRetryCode('hold_expired')).toBe(false);
    expect(canRetryCode('reopen_unavailable')).toBe(true);
  });
});

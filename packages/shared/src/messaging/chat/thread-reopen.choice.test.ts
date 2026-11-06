import { describe, expect, it } from 'vitest';
import { isHoldFailure, REOPEN_NO_TEMPLATE, reopenChoiceOf } from './thread-reopen.js';

describe('reopenChoiceOf: the chat_reopen_template choice (owner 2026-11-06)', () => {
  it('«بدون قالب» (none, any case, trimmed) waits for the family', () => {
    expect(reopenChoiceOf(REOPEN_NO_TEMPLATE)).toBe('wait');
    expect(reopenChoiceOf(' None ')).toBe('wait');
  });

  it('a template key, an empty or an unknown value stays a template (fails visibly if unusable)', () => {
    expect(reopenChoiceOf('welcome_greeting')).toBe('template');
    expect(reopenChoiceOf('')).toBe('template');
    expect(reopenChoiceOf('none_x')).toBe('template');
  });
});

describe('isHoldFailure', () => {
  it('the held text failures a retry holds again; not hold_expired, not others', () => {
    for (const code of ['reopen_failed', 'reopen_unavailable', 'reopen_tries_used']) {
      expect(isHoldFailure(code)).toBe(true);
    }
    expect(isHoldFailure('hold_expired')).toBe(false);
    expect(isHoldFailure('network')).toBe(false);
    expect(isHoldFailure(null)).toBe(false);
  });
});

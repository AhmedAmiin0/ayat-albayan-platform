import { describe, expect, it } from 'vitest';
import { noticeOf } from './code-choices.helpers';

const FAMILY = { to: 'family' as const, masked: '••••01' };

describe('noticeOf: why no number can be chosen', () => {
  it('codes off wins over an empty list', () => {
    expect(noticeOf({ available: false, to: [] })).toBe('unavailable');
  });

  it('no number on file', () => {
    expect(noticeOf({ available: true, to: [] })).toBe('noPhone');
  });

  it('a number to send to: no notice', () => {
    expect(noticeOf({ available: true, to: [FAMILY] })).toBeNull();
  });
});

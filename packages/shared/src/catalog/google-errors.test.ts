import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { GOOGLE_ERROR_KEYS, googleErrorKey } from '@ab/catalog';

describe('Google error codes', () => {
  it('maps known codes and sends everything else to «other»', () => {
    expect(googleErrorKey('invalid_grant')).toBe('invalid_grant');
    expect(googleErrorKey('429 rateLimitExceeded')).toBe('other');
  });

  it('every key has its Arabic words', () => {
    for (const k of [...GOOGLE_ERROR_KEYS, 'other' as const]) expect(ar.googleSync.errors[k]).toBeTruthy();
  });
});

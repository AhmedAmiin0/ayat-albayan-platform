import { GOOGLE_SKIP_REASONS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { errorText, fill, listOf, oauthReturnNote, RETRYABLE, skipLabel } from './google-format';

describe('Google display helpers', () => {
  it('fill replaces every known {key} and keeps unknown ones', () => {
    expect(fill('{n} of {m} {x}', { n: 2, m: 'five' })).toBe('2 of five {x}');
  });

  it('every skip reason has words', () => {
    for (const r of GOOGLE_SKIP_REASONS) expect(skipLabel(r).length).toBeGreaterThan(0);
    expect(skipLabel('not_platform_origin')).toBe(t.googleSync.web.notPlatformOrigin);
  });

  it('only failed and skipped items can be retried (gone stays gone, docs/24 §2.4)', () => {
    expect([...RETRYABLE].sort()).toEqual(['failed', 'skipped']);
  });

  it('lists names in the page language', () => {
    expect(listOf(['A'])).toBe('A');
    expect(listOf(['A', 'B'])).toContain('B');
  });

  it('reads the OAuth return query', () => {
    expect(oauthReturnNote('?google=connected')).toEqual({ message: t.googleSync.connection.connected, tone: 'info' });
    expect(oauthReturnNote('?google=error&reason=denied')).toEqual({
      message: t.googleSync.connection.failed.replace('{reason}', t.googleSync.connection.reasons.denied),
      tone: 'error',
    });
    expect(oauthReturnNote('?google=error&reason=<b>x</b>')?.message).toBe(t.googleSync.connection.failed.replace('{reason}', t.googleSync.connection.reasons.exchange));
    expect(errorText('invalid_grant')).toBe(t.googleSync.errors.invalid_grant);
    expect(errorText('429 rateLimitExceeded')).toBe(t.googleSync.errors.other.replace('{code}', '429 rateLimitExceeded'));
    expect(oauthReturnNote('')).toBeNull();
    expect(oauthReturnNote('?google=other')).toBeNull();
  });
});

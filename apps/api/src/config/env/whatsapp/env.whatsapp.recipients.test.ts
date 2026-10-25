import { describe, expect, it } from 'vitest';
import { allowedRecipients, loadEnv, parseAllowedRecipients, recipientAllowed } from '../env';
import { EMPTY_RECIPIENTS } from './env.recipients';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };

describe('parseAllowedRecipients (docs/12 §13.1, fail closed)', () => {
  it.each<[string, string[]]>([
    ['+201001234567', ['+201001234567']],
    ['+20 100 123 4567', ['+201001234567']],
    ['+20-100-123-4567', ['+201001234567']],
    ['+20.100.123.4567', ['+201001234567']],
    ['+20 (100) 123 4567', ['+201001234567']],
    ['201001234567', ['+201001234567']],
    ['+201001234567,', ['+201001234567']],
    [' +201001234567 , +966501234567 ', ['+201001234567', '+966501234567']],
    ['+201001234567, 201001234567, +20 100 123 4567', ['+201001234567']],
  ])('%s → ok', (raw, items) => {
    expect(parseAllowedRecipients(raw)).toEqual({ items, bad: null });
  });

  it.each<[string, string]>([
    [',', EMPTY_RECIPIENTS],
    [' , ', EMPTY_RECIPIENTS],
    ['abc', 'abc'],
    ['+201001234567, abc ,+966501234567', 'abc'],
    ['00201001234567', '00201001234567'],
    ['+2010', '+2010'],
  ])('%s → bad %s', (raw, bad) => {
    expect(parseAllowedRecipients(raw)).toEqual({ items: [], bad });
  });
});

describe('WA_ALLOWED_RECIPIENTS at boot', () => {
  it('unset, blank or whitespace = undefined, so allowedRecipients is null (no restriction)', () => {
    for (const v of [undefined, '', '   ']) {
      const env = loadEnv(v === undefined ? BASE : { ...BASE, WA_ALLOWED_RECIPIENTS: v });
      expect(env.WA_ALLOWED_RECIPIENTS).toBeUndefined();
      expect(allowedRecipients(env)).toBeNull();
    }
  });

  it('a valid list is normalised', () => {
    const env = loadEnv({ ...BASE, WA_ALLOWED_RECIPIENTS: '20 100 123 4567,+966501234567' });
    expect(env.WA_ALLOWED_RECIPIENTS).toEqual(['+201001234567', '+966501234567']);
    expect(allowedRecipients(env)).toEqual(['+201001234567', '+966501234567']);
  });

  it('a bad list fails the boot and names the offending item', () => {
    expect(() => loadEnv({ ...BASE, WA_ALLOWED_RECIPIENTS: '+201001234567,abc' })).toThrow(/abc/);
    expect(() => loadEnv({ ...BASE, WA_ALLOWED_RECIPIENTS: ' , ' })).toThrow(/WA_ALLOWED_RECIPIENTS/);
  });
});

describe('recipientAllowed', () => {
  it('null / undefined = unrestricted; [] = nobody', () => {
    expect(recipientAllowed(null, '+201001234567')).toBe(true);
    expect(recipientAllowed(undefined, '+201001234567')).toBe(true);
    expect(recipientAllowed([], '+201001234567')).toBe(false);
  });

  it('matches the stored +E.164 and Graph’s bare digits; off-list is refused', () => {
    const list = ['+201001234567'];
    expect(recipientAllowed(list, '+201001234567')).toBe(true);
    expect(recipientAllowed(list, '201001234567')).toBe(true);
    expect(recipientAllowed(list, '+966501234567')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { parseClientTag, UNTAGGED } from './client-tag';

describe('parseClientTag (X-AB-Client)', () => {
  it('accepts <platform>/<build>', () => {
    expect(parseClientTag('web/2026.10.23+abc')).toBe('web/2026.10.23+abc');
    expect(parseClientTag('android/0.2.0-ota.3')).toBe('android/0.2.0-ota.3');
    expect(parseClientTag(' ios/0.2.0_1 ')).toBe('ios/0.2.0_1');
  });

  it('missing, repeated or malformed → untagged', () => {
    for (const v of [
      undefined,
      ['web/1', 'web/2'],
      '',
      'web',
      'web/',
      '/1',
      'Web/1',
      'w/1',
      'abcdefghijklmnopq/1',
      'web/1/2',
      'web/1 2',
      `web/${'x'.repeat(41)}`,
      'web/1;drop',
      'android/0.2.0é',
    ]) {
      expect(parseClientTag(v)).toBe(UNTAGGED);
    }
    expect(parseClientTag(`web/${'x'.repeat(40)}`)).toBe(`web/${'x'.repeat(40)}`);
  });
});

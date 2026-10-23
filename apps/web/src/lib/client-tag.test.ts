import { describe, expect, it } from 'vitest';
import { CLIENT_HEADER, sanitizeBuild, WEB_CLIENT_TAG } from './client-tag';

describe('client tag (docs/26 §2f)', () => {
  it('keeps a plain build id: a sha, a version, a dotted tag', () => {
    for (const id of ['c140b4cc', '1.2.3', 'v0.2.0+42', 'build_7-rc.1']) expect(sanitizeBuild(id)).toBe(id);
  });

  it('anything else reads as dev: unset, blank, too long, spaces, slashes, non-strings', () => {
    for (const raw of [undefined, null, '', ' ', 'a'.repeat(41), 'web build', 'a/b', 'x\ny', 42]) {
      expect(sanitizeBuild(raw)).toBe('dev');
    }
  });

  it('the test build is web/dev under the X-AB-Client header', () => {
    expect(CLIENT_HEADER).toBe('X-AB-Client');
    expect(WEB_CLIENT_TAG).toBe('web/dev');
  });
});

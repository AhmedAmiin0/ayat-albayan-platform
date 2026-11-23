import { describe, expect, it } from 'vitest';
import { buildClientTag, CLIENT_HEADER, sanitizeBuild, WEB_CLIENT_TAG } from './client-tag';

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

describe('buildClientTag: <app>/<short sha> from the build env', () => {
  it('a production build of either web app carries its commit', () => {
    expect(buildClientTag('web', '4ac41e4')).toBe('web/4ac41e4');
    expect(buildClientTag('family-web', '4ac41e4')).toBe('family-web/4ac41e4');
  });

  it('no build id (local dev, tests) or a malformed one reads as dev', () => {
    for (const build of [undefined, '', 'not a sha']) {
      expect(buildClientTag('web', build)).toBe('web/dev');
      expect(buildClientTag('family-web', build)).toBe('family-web/dev');
    }
  });

  it('an unset or unknown app name falls back to the staff app, web', () => {
    for (const app of [undefined, '', 'Web', 'mobile', 'family web']) {
      expect(buildClientTag(app, '4ac41e4')).toBe('web/4ac41e4');
    }
  });
});

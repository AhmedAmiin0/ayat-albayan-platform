import { WEB_CLIENT_TAG } from '@ab/web-kit';
import { describe, expect, it } from 'vitest';

describe('the family build tags its API calls as family-web (docs/26 §2f)', () => {
  it('names the family app; no build id in tests reads as dev', () => {
    expect(WEB_CLIENT_TAG).toBe('family-web/dev');
  });
});

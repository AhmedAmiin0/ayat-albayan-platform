import { describe, expect, it } from 'vitest';
import { publicCustom } from './public.js';

describe('public custom entries (GET /settings/public)', () => {
  const rows = [
    { key: 'promo', value: 'hi', is_public: true },
    { key: 'internal.note', value: 'private', is_public: false },
    { key: 'messaging_enabled', value: 'shadow', is_public: true },
  ];

  it('keeps only the rows flagged public that do not shadow a setting', () => {
    expect(publicCustom(rows)).toEqual({ promo: 'hi' });
    expect(publicCustom([])).toEqual({});
  });

  it('never leaks a private row or a setting key, in any form', () => {
    const text = JSON.stringify(publicCustom(rows));
    for (const leak of ['messaging_enabled', 'internal.note', 'private', 'shadow']) expect(text).not.toContain(leak);
  });
});

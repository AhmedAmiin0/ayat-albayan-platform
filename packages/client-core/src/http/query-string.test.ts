import { describe, expect, it } from 'vitest';
import { CLIENT_HEADER, toQueryString } from '../index.js';

describe('toQueryString', () => {
  it('keeps defined, non-empty values, encoded', () => {
    expect(toQueryString({ q: 'أحمد', page: 2, status: undefined, tag: '' })).toBe(
      `?q=${encodeURIComponent('أحمد')}&page=2`,
    );
  });

  it('is empty when nothing is left', () => {
    expect(toQueryString({ a: undefined })).toBe('');
  });
});

describe('CLIENT_HEADER', () => {
  it('is the docs/26 §2f header name', () => {
    expect(CLIENT_HEADER).toBe('X-AB-Client');
  });
});

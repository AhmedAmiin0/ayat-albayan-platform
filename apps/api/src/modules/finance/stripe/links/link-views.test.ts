import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../pay/pay-html';
import { apiPublicOrigin } from './link-views';

describe('the family link host: API_PUBLIC_URL (the API serves /pay/<token> itself)', () => {
  it('the configured API host, without a trailing slash', () => {
    expect(apiPublicOrigin({ API_PUBLIC_URL: 'https://api.example.com/' })).toBe('https://api.example.com');
    expect(apiPublicOrigin({ API_PUBLIC_URL: ' http://127.0.0.1:3110 ' })).toBe('http://127.0.0.1:3110');
  });

  it('unset, blank, a path or not http(s): this process on localhost (local dev)', () => {
    expect(apiPublicOrigin({})).toBe('http://localhost:3000');
    expect(apiPublicOrigin({ API_PUBLIC_URL: '', PORT: '3999' })).toBe('http://localhost:3999');
    expect(apiPublicOrigin({ API_PUBLIC_URL: 'javascript:alert(1)' })).toBe('http://localhost:3000');
    expect(apiPublicOrigin({ API_PUBLIC_URL: 'https://api.example.com/v1' })).toBe('http://localhost:3000');
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML specials', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});

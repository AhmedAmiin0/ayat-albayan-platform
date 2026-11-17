import { describe, expect, it } from 'vitest';
import { allowedHosts, extraHosts, isAllowedTarget } from './short-link.allow';

const hosts = allowedHosts([
  'https://app.example.com',
  ' https://admin.example.com/ ',
  'https://api.example.com',
  '',
  'not a url',
]);

describe('the short link allow-list (no open redirect)', () => {
  it('our web and API origins and Google Meet, over https', () => {
    expect([...hosts].sort()).toEqual([
      'admin.example.com',
      'api.example.com',
      'app.example.com',
      'meet.google.com',
    ]);
    expect(isAllowedTarget('https://app.example.com/teacher-report/abc.def', hosts)).toBe(true);
    expect(isAllowedTarget('https://meet.google.com/abc-defg-hij', hosts)).toBe(true);
    expect(isAllowedTarget('https://api.example.com/pay/x', hosts)).toBe(true);
  });

  it('refuses other hosts, look-alikes, http, javascript:, data: and credentials', () => {
    for (const url of [
      'https://evil.example.org/x',
      'https://app.example.com.evil.org/x',
      'https://evilapp.example.com/x',
      'http://app.example.com/x',
      'javascript:alert(1)',
      'data:text/html,hi',
      '//app.example.com/x',
      'https://user:pass@app.example.com/x',
      'https://app.example.com:8443/x',
      'https://vercelayat-r.vercel.app/r/a/b',
    ]) {
      expect([url, isAllowedTarget(url, hosts)]).toEqual([url, false]);
    }
  });

  it('extra hosts (managed links): bare hosts only, folded to lower case; junk is skipped', () => {
    expect(extraHosts(' Forms.Example.org, docs.example.com  x  https://a.b/ evil..com')).toEqual([
      'forms.example.org',
      'docs.example.com',
    ]);
    expect(extraHosts('')).toEqual([]);
    const hosts = new Set([
      ...allowedHosts(['https://app.example.com']),
      ...extraHosts('forms.example.org'),
    ]);
    expect(isAllowedTarget('https://forms.example.org/f/1', hosts)).toBe(true);
    expect(isAllowedTarget('http://forms.example.org/f/1', hosts)).toBe(false);
    expect(isAllowedTarget('https://x.forms.example.org/f/1', hosts)).toBe(false);
  });
});

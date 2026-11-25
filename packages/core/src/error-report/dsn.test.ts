import { describe, expect, it } from 'vitest';
import { parseDsn } from './dsn';

describe('parseDsn (Sentry or GlitchTip DSN → envelope endpoint)', () => {
  it('https://key@host/42 → the envelope URL and the public key', () => {
    expect(parseDsn('https://abc123@errors.example.com/42')).toEqual({
      endpoint: 'https://errors.example.com/api/42/envelope/',
      key: 'abc123',
      dsn: 'https://abc123@errors.example.com/42',
    });
  });

  it('keeps a path prefix and a port (self-hosted GlitchTip)', () => {
    expect(parseDsn('https://k@gt.example.com:8443/errors/7')?.endpoint).toBe(
      'https://gt.example.com:8443/errors/api/7/envelope/',
    );
  });

  it.each([undefined, '', '  ', 'not a url', 'https://errors.example.com/42', 'https://k@errors.example.com/', 'ftp://k@h/1', 'https://k@h/abc'])(
    '%s → null (reporting stays off)',
    (raw) => {
      expect(parseDsn(raw)).toBeNull();
    },
  );
});

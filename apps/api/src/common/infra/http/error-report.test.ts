import { describe, expect, it, vi } from 'vitest';
import { apiErrorReporter } from './error-report';

describe('apiErrorReporter (SENTRY_DSN; no DSN in git)', () => {
  it('unset or blank: off, and nothing is ever sent', () => {
    const send = vi.fn();
    expect(apiErrorReporter({}, { send }).enabled).toBe(false);
    const off = apiErrorReporter({ SENTRY_DSN: ' ' }, { send });
    off.capture(new Error('x'));
    expect(off.enabled).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('a valid DSN: on, sending through the given transport', () => {
    const send = vi.fn(async () => undefined);
    const on = apiErrorReporter({ SENTRY_DSN: 'https://k@errors.example.com/3' }, { send });
    on.capture(new Error('x'));
    expect(on.enabled).toBe(true);
    expect(send).toHaveBeenCalledWith('https://errors.example.com/api/3/envelope/', expect.anything());
  });

  it('set but invalid: off, with one warning that names the variable only', () => {
    const warn = vi.fn();
    const r = apiErrorReporter({ SENTRY_DSN: 'nonsense-secret' }, { send: vi.fn(), warn });
    expect(r.enabled).toBe(false);
    expect(warn).toHaveBeenCalledWith('SENTRY_DSN is set but is not a valid DSN: error reporting stays off');
  });
});

describe('apiErrorReporter defaults (the real fetch and the Nest logger)', () => {
  it('sends with fetch and warns through the logger when no deps are given', async () => {
    const { Logger } = await import('@nestjs/common');
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    apiErrorReporter({ SENTRY_DSN: 'nonsense' });
    expect(warn).toHaveBeenCalledTimes(1);
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    apiErrorReporter({ SENTRY_DSN: 'https://k@errors.example.com/3' }).capture(new Error('x'));
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    warn.mockRestore();
  });
});

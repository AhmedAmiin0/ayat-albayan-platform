import { describe, expect, it, vi } from 'vitest';
import type { ReportTransport } from './error-report.types';
import { createErrorReporter } from './reporter';

const DSN = 'https://k@e.example.com/1';

function setup(dsn: string | undefined, now = { t: 0 }) {
  const send = vi.fn<ReportTransport>().mockResolvedValue(undefined);
  let n = 0;
  const reporter = createErrorReporter({ dsn, app: 'api', send, now: () => now.t, newId: () => String(++n).padStart(32, '0') });
  return { reporter, send, now };
}

describe('createErrorReporter (a complete no-op without a DSN)', () => {
  it.each([undefined, '', 'nonsense'])('DSN %s: off, nothing is ever sent', (dsn) => {
    const t = setup(dsn);
    expect(t.reporter.enabled).toBe(false);
    t.reporter.capture(new Error('x'));
    expect(t.send).not.toHaveBeenCalled();
  });

  it('with a DSN: POSTs the envelope with the Sentry auth header', () => {
    const t = setup(DSN);
    expect(t.reporter.enabled).toBe(true);
    t.reporter.capture(new Error('boom'), { request_id: 'r1' });
    const [url, init] = t.send.mock.calls[0] ?? [];
    expect(url).toBe('https://e.example.com/api/1/envelope/');
    expect(init?.headers['content-type']).toBe('application/x-sentry-envelope');
    expect(init?.headers['x-sentry-auth']).toBe('Sentry sentry_version=7, sentry_key=k, sentry_client=ab-error-report/1');
    expect(init?.body).toContain('"request_id":"r1"');
  });

  it('the same error twice within a minute is sent once; after a minute again', () => {
    const t = setup(DSN);
    t.reporter.capture(new Error('same'));
    t.reporter.capture(new Error('same'));
    t.reporter.capture('plain text');
    t.reporter.capture('plain text');
    t.now.t = 61_000;
    t.reporter.capture(new Error('same'));
    expect(t.send).toHaveBeenCalledTimes(3);
  });

  it('at most 20 events a minute (an error storm never floods the tracker)', () => {
    const t = setup(DSN);
    for (let i = 0; i < 50; i += 1) t.reporter.capture(new Error(`e${i}`));
    expect(t.send).toHaveBeenCalledTimes(20);
    t.now.t = 60_001;
    t.reporter.capture(new Error('later'));
    expect(t.send).toHaveBeenCalledTimes(21);
  });

  it('a failing or throwing transport never throws into the app', async () => {
    const t = setup(DSN);
    t.send.mockRejectedValueOnce(new Error('offline'));
    expect(() => t.reporter.capture(new Error('a'))).not.toThrow();
    t.send.mockImplementationOnce(() => {
      throw new Error('sync');
    });
    expect(() => t.reporter.capture(new Error('b'))).not.toThrow();
    await Promise.resolve();
  });
});

describe('createErrorReporter defaults', () => {
  it('its own clock and 32-hex event ids', () => {
    const send = vi.fn<ReportTransport>().mockResolvedValue(undefined);
    createErrorReporter({ dsn: DSN, app: 'web', send }).capture(new Error('x'));
    const body = send.mock.calls[0]?.[1].body ?? '';
    expect(JSON.parse(body.split('\n')[0] ?? '{}')).toMatchObject({ event_id: expect.stringMatching(/^[0-9a-f]{32}$/) });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { installErrorReporting, type UncaughtSource } from './error-report';

const DSN = 'https://k@errors.example.com/5';

function source() {
  let handler: ((error: unknown) => void) | undefined;
  const listen = vi.fn<UncaughtSource>((h) => {
    handler = h;
  });
  return { listen, fire: (e: unknown) => handler?.(e) };
}

describe('installErrorReporting (web and phone apps; off without a DSN)', () => {
  it.each([undefined, '', 'not-a-dsn'])('DSN %s: no listener at all, nothing sent', (dsn) => {
    const s = source();
    const send = vi.fn();
    const reporter = installErrorReporting({ dsn, app: 'staff-web', listen: s.listen, send });
    expect(reporter.enabled).toBe(false);
    expect(s.listen).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a DSN: uncaught errors are sent, tagged with the app', () => {
    const s = source();
    const send = vi.fn(async () => undefined);
    installErrorReporting({ dsn: DSN, app: 'staff-mobile', listen: s.listen, send });
    s.fire(new Error('render failed'));
    expect(send).toHaveBeenCalledTimes(1);
    const [url, init] = send.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe('https://errors.example.com/api/5/envelope/');
    expect(init.body).toContain('"app":"staff-mobile"');
    expect(init.body).toContain('render failed');
  });
});

describe('installErrorReporting default transport', () => {
  it('POSTs with fetch, keepalive on', () => {
    const fetch = vi.fn(async () => new Response(null));
    vi.stubGlobal('fetch', fetch);
    const s = source();
    installErrorReporting({ dsn: DSN, app: 'web', listen: s.listen });
    s.fire(new Error('x'));
    expect(fetch).toHaveBeenCalledWith('https://errors.example.com/api/5/envelope/', expect.objectContaining({ keepalive: true, method: 'POST' }));
    vi.unstubAllGlobals();
  });
});

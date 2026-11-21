import { describe, expect, it, vi } from 'vitest';
import { installWebErrorReporting } from './web-errors';

const DSN = 'https://k@errors.example.com/8';

function errorEvent(error: unknown): Event {
  return Object.assign(new Event('error'), { error });
}

function rejection(reason: unknown): Event {
  return Object.assign(new Event('unhandledrejection'), { reason });
}

describe('installWebErrorReporting (VITE_SENTRY_DSN; off without it)', () => {
  it('no DSN: no listener, nothing sent', () => {
    const target = new EventTarget();
    const add = vi.spyOn(target, 'addEventListener');
    const send = vi.fn();
    installWebErrorReporting({ env: {}, target, send });
    expect(add).not.toHaveBeenCalled();
    target.dispatchEvent(errorEvent(new Error('x')));
    expect(send).not.toHaveBeenCalled();
  });

  it('a DSN: uncaught errors and unhandled rejections are reported with the host', () => {
    const target = new EventTarget();
    const send = vi.fn(async () => undefined);
    installWebErrorReporting({ env: { VITE_SENTRY_DSN: DSN }, target, send });
    target.dispatchEvent(errorEvent(new Error('render')));
    target.dispatchEvent(rejection(new Error('load')));
    expect(send).toHaveBeenCalledTimes(2);
    const bodies = send.mock.calls.map((c) => (c as unknown as [string, { body: string }])[1].body);
    expect(bodies[0]).toContain('"app":"web"');
    expect(bodies[1]).toContain('load');
  });
});

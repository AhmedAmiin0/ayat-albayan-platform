import { installMobileErrorReporting } from './error-report';

const DSN = 'https://k@errors.example.com/9';

function errorUtils() {
  const previous = jest.fn();
  let current: (error: unknown, isFatal?: boolean) => void = previous;
  return {
    previous,
    fire: (e: unknown, fatal = false) => current(e, fatal),
    utils: {
      getGlobalHandler: () => current,
      setGlobalHandler: jest.fn((h: (error: unknown, isFatal?: boolean) => void) => {
        current = h;
      }),
    },
  };
}

describe('installMobileErrorReporting (EXPO_PUBLIC_SENTRY_DSN; off without it)', () => {
  it('no DSN: React Native’s handler is left alone, nothing sent', () => {
    const e = errorUtils();
    const send = jest.fn();
    installMobileErrorReporting('staff-mobile', { dsn: undefined, errorUtils: e.utils, send });
    expect(e.utils.setGlobalHandler).not.toHaveBeenCalled();
    e.fire(new Error('x'));
    expect(send).not.toHaveBeenCalled();
    expect(e.previous).toHaveBeenCalledTimes(1);
  });

  it('a DSN: the error is reported, then React Native’s own handler still runs', () => {
    const e = errorUtils();
    const send = jest.fn(async () => undefined);
    installMobileErrorReporting('family-mobile', { dsn: DSN, errorUtils: e.utils, send });
    const boom = new Error('boom');
    e.fire(boom, true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(send.mock.calls[0])).toContain('family-mobile');
    expect(e.previous).toHaveBeenCalledWith(boom, true);
  });

  it('no ErrorUtils (tests, web): nothing to hook, never a crash', () => {
    expect(() => installMobileErrorReporting('staff-mobile', { dsn: DSN, errorUtils: undefined })).not.toThrow();
  });
});

describe('installMobileErrorReporting defaults (the build env and the RN global)', () => {
  it('no EXPO_PUBLIC_SENTRY_DSN in the build: off, React Native’s handler untouched', () => {
    const e = errorUtils();
    const holder = globalThis as { ErrorUtils?: unknown };
    const before = holder.ErrorUtils;
    holder.ErrorUtils = e.utils;
    expect(installMobileErrorReporting('staff-mobile').enabled).toBe(false);
    expect(e.utils.setGlobalHandler).not.toHaveBeenCalled();
    holder.ErrorUtils = before;
  });
});

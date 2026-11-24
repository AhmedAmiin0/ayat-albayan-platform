import { appAlias } from './metro.cjs';

const APP = '/repo/apps/family-mobile';
const echo = (_context: object, name: string): string => name;

describe('appAlias: @/ resolves to the app’s own src', () => {
  it('maps @/x to <app>/src/x and hands it to the next resolver', () => {
    const resolve = appAlias(APP, echo);
    expect(resolve({}, '@/auth/session', 'android')).toBe(`${APP}/src/auth/session`);
  });

  it('leaves packages, relative paths and look-alike names unchanged', () => {
    const resolve = appAlias(APP, echo);
    expect(resolve({}, '@ab/mobile-kit', 'ios')).toBe('@ab/mobile-kit');
    expect(resolve({}, './x', 'ios')).toBe('./x');
    expect(resolve({}, '@/', 'ios')).toBe(`${APP}/src`);
    expect(resolve({}, 'x/@/y', 'ios')).toBe('x/@/y');
  });

  it('passes the context and platform through untouched', () => {
    const next = jest.fn(echo);
    const context = { origin: 'a.ts' };
    appAlias(APP, next)(context, '@/x', 'web');
    expect(next).toHaveBeenCalledWith(context, `${APP}/src/x`, 'web');
  });
});

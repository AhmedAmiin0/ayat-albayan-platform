import { describe, expect, it } from 'vitest';
import { readPushEnv, webPushSupport, type PushEnv } from './web-push-support';

const READY: PushEnv = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  permission: 'default',
  isIos: false,
  isStandalone: false,
};

describe('webPushSupport', () => {
  it('ready when every API is there and the site is not blocked', () => {
    expect(webPushSupport(READY)).toBe('ready');
    expect(webPushSupport({ ...READY, permission: 'granted' })).toBe('ready');
  });

  it('denied when the user blocked notifications for the site', () => {
    expect(webPushSupport({ ...READY, permission: 'denied' })).toBe('denied');
  });

  it('unsupported when any API is missing', () => {
    expect(webPushSupport({ ...READY, hasServiceWorker: false })).toBe('unsupported');
    expect(webPushSupport({ ...READY, hasPushManager: false })).toBe('unsupported');
    expect(webPushSupport({ ...READY, hasNotification: false })).toBe('unsupported');
  });

  it('iPhone / iPad in a tab: add to the Home Screen first; installed: the usual checks', () => {
    const tab = { ...READY, isIos: true, hasPushManager: false, hasNotification: false };
    expect(webPushSupport(tab)).toBe('ios-install');
    expect(webPushSupport({ ...READY, isIos: true, isStandalone: true })).toBe('ready');
    expect(webPushSupport({ ...READY, isIos: true, isStandalone: true, permission: 'denied' })).toBe('denied');
  });
});

describe('readPushEnv', () => {
  const fake = (nav: object, extra: object = {}) =>
    ({ navigator: { userAgent: 'Mozilla/5.0 (X11; Linux)', platform: 'Linux', maxTouchPoints: 0, ...nav }, ...extra }) as unknown as Window;

  it('reads a desktop browser with push', () => {
    const win = fake({ serviceWorker: {} }, { PushManager: function PushManager() {}, Notification: { permission: 'granted' } });
    expect(readPushEnv(win)).toEqual({ ...READY, permission: 'granted' });
  });

  it('reads an iPhone tab, and an iPad posing as a Mac, as iOS', () => {
    const iphone = fake({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    expect(readPushEnv(iphone)).toMatchObject({ isIos: true, hasNotification: false, permission: 'default' });
    const ipad = fake({ platform: 'MacIntel', maxTouchPoints: 5 }, { matchMedia: () => ({ matches: true }) });
    expect(readPushEnv(ipad)).toMatchObject({ isIos: true, isStandalone: true });
    expect(readPushEnv(fake({ standalone: true }))).toMatchObject({ isStandalone: true });
  });

  it('reads jsdom without throwing', () => {
    expect(readPushEnv().hasPushManager).toBe(false);
  });
});

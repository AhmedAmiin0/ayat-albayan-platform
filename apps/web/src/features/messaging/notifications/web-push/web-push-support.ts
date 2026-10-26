// Can this browser take web push (R-NOT-01)? Pure over an injected environment, so every branch
// is tested; readPushEnv() reads the real one. iPhone/iPad Safari only offers push to a site
// added to the Home Screen and opened from there (iOS 16.4+), so a plain tab gets the how-to.

export type WebPushSupport = 'unsupported' | 'ios-install' | 'denied' | 'ready';

export interface PushEnv {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  /** Notification.permission ('default' when there is no Notification API). */
  permission: NotificationPermission;
  isIos: boolean;
  /** Running as an installed app (display-mode standalone / navigator.standalone). */
  isStandalone: boolean;
}

export function webPushSupport(env: PushEnv): WebPushSupport {
  if (env.isIos && !env.isStandalone) return 'ios-install';
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return 'unsupported';
  return env.permission === 'denied' ? 'denied' : 'ready';
}

/** iPadOS reports a Mac user agent; touch points tell it apart. */
function isIosDevice(nav: Navigator): boolean {
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

function isStandalone(win: Window): boolean {
  const legacy = 'standalone' in win.navigator && win.navigator.standalone === true;
  return legacy || (win.matchMedia?.('(display-mode: standalone)').matches ?? false);
}

/** The environment of this window. */
export function readPushEnv(win: Window = window): PushEnv {
  const notification: Pick<typeof Notification, 'permission'> | undefined = Reflect.get(win, 'Notification');
  return {
    hasServiceWorker: 'serviceWorker' in win.navigator,
    hasPushManager: 'PushManager' in win,
    hasNotification: notification !== undefined,
    permission: notification?.permission ?? 'default',
    isIos: isIosDevice(win.navigator),
    isStandalone: isStandalone(win),
  };
}

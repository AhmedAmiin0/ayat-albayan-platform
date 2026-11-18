import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { WebPushView } from './use-web-push';

/** What each push state says (the bell panel's toggle and the family «حسابي» row). */
export const PUSH_MESSAGE: Record<WebPushView, string> = {
  unsupported: t.bell.push.unsupported,
  'ios-install': t.bell.push.iosInstall,
  denied: t.bell.push.denied,
  'not-configured': t.bell.push.notConfigured,
  loading: t.bell.push.off,
  on: t.bell.push.on,
  off: t.bell.push.off,
};

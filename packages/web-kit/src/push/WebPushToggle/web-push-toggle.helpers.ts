import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { WebPushView } from '@ab/web-kit/push/use-web-push';

export const MESSAGE: Record<WebPushView, string> = {
  unsupported: t.bell.push.unsupported,
  'ios-install': t.bell.push.iosInstall,
  denied: t.bell.push.denied,
  'not-configured': t.bell.push.notConfigured,
  loading: t.bell.push.off,
  on: t.bell.push.on,
  off: t.bell.push.off,
};

import { useId } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useWebPush } from '@ab/web-kit/push/use-web-push';

export function useWebPushToggle() {
  const push = useWebPush();
  // The bell renders twice (compact bar and wide head), one shown.
  const titleId = useId();
  const on = push.view === 'on';
  const toggles = on || push.view === 'off';
  const toggle = on ? push.disable : push.enable;
  const idle = on ? t.bell.push.disable : t.bell.push.enable;
  const label = push.busy ? t.bell.push.working : idle;
  return { push, titleId, toggles, toggle, label };
}

import { useId } from 'react';
import { useWebPush } from '@ab/web-kit/push/use-web-push';

export function useWebPushToggle() {
  const push = useWebPush();
  const titleId = useId();
  // the bell renders twice (compact bar and wide head), one shown
  const toggles = push.view === 'on' || push.view === 'off';
  return { push, titleId, toggles };
}

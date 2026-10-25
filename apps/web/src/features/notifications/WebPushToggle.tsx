import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n';
import { useWebPush, type WebPushView } from './use-web-push';

const MESSAGE: Record<WebPushView, string> = {
  unsupported: t.bell.push.unsupported,
  'ios-install': t.bell.push.iosInstall,
  denied: t.bell.push.denied,
  'not-configured': t.bell.push.notConfigured,
  loading: t.bell.push.off,
  on: t.bell.push.on,
  off: t.bell.push.off,
};

/**
 * Foot of the bell panel: browser push on this device. The button is the only way to the
 * permission prompt; the other states only explain (iPhone: add to the Home Screen first).
 */
export function WebPushToggle() {
  const push = useWebPush();
  const titleId = useId(); // the bell renders twice (compact bar and wide head), one shown
  const toggles = push.view === 'on' || push.view === 'off';
  return (
    <section aria-labelledby={titleId} className="grid gap-2 border-t border-rule px-4 py-3">
      <h3 id={titleId} className="text-xs font-semibold text-ink-2">
        {t.bell.push.title}
      </h3>
      <p className="text-xs text-pretty text-ink-3">{MESSAGE[push.view]}</p>
      {push.failed && (
        <p role="alert" className="text-xs text-danger">
          {t.bell.push.failed}
        </p>
      )}
      {toggles && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={push.busy}
          onClick={push.view === 'on' ? push.disable : push.enable}
          className="justify-self-start"
        >
          {push.busy ? t.bell.push.working : push.view === 'on' ? t.bell.push.disable : t.bell.push.enable}
        </Button>
      )}
    </section>
  );
}

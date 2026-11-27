import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MESSAGE } from './web-push-toggle.helpers';
import { useWebPushToggle } from './use-web-push-toggle';

/**
 * Foot of the bell panel: browser push on this device. The button is the only way to the
 * permission prompt; the other states only explain (iPhone: add to the Home Screen first).
 */
export function WebPushToggle() {
  const { push, titleId, toggles, toggle, label } = useWebPushToggle();
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
          onClick={toggle}
          className="justify-self-start"
        >
          {label}
        </Button>
      )}
    </section>
  );
}

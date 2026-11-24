import { useBlocker } from '@tanstack/react-router';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const l = t.settingsValues.leave;

/** Unsaved rows ask before leaving (docs/26b §2); switching group or searching keeps edits. */
export function LeaveGuard({ names }: { names: readonly string[] }) {
  const dirty = names.length > 0;
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => dirty && current.pathname !== next.pathname,
    enableBeforeUnload: dirty,
    withResolver: true,
  });
  if (blocker.status !== 'blocked') return null;
  return (
    <Dialog
      compact
      title={l.title}
      glyph={{ tone: 'neutral', shape: 'hollow' }}
      description={l.body.replace('{names}', names.map((n) => `«${n}»`).join(t.common.listSeparator))}
      onClose={blocker.reset}
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={blocker.reset}>
            {l.stay}
          </Button>
          <Button variant="danger-quiet" onClick={blocker.proceed}>
            {l.leave}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}

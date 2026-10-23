import { useBlocker } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';

const l = t.settingsValues.leave;

/**
 * Leaving «القيم» with unsaved rows asks first (docs/26b §2 «One save model»): in-app navigation
 * through the router's blocker, a reload or a closed tab through beforeunload. Switching the group
 * or searching stays on the page (only the search changes), so it never asks: edits are kept.
 */
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

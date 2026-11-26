import { useBlocker } from '@tanstack/react-router';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import type { RouteLeaveGuardProps } from './RouteLeaveGuard.types';

/** Only a new pathname asks; a search change on the same page never does. */
export function RouteLeaveGuard({ when, words }: RouteLeaveGuardProps) {
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => when && current.pathname !== next.pathname,
    enableBeforeUnload: when,
    withResolver: true,
  });
  if (blocker.status !== 'blocked') return null;
  return (
    <Dialog
      compact
      title={words.title}
      glyph={{ tone: 'neutral', shape: 'hollow' }}
      description={words.body}
      onClose={blocker.reset}
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={blocker.reset}>
            {words.stay}
          </Button>
          <Button variant="danger-quiet" onClick={blocker.proceed}>
            {words.leave}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}

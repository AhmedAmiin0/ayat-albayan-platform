import { useBlocker } from '@tanstack/react-router';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { BookingLeaveGuardProps } from './BookingLeaveGuard.types';

const l = t.booking.leave;

/** Another student or lead stays on /admin/book with its own draft: only a new page asks. */
export function BookingLeaveGuard({ unfinished }: BookingLeaveGuardProps) {
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => unfinished && current.pathname !== next.pathname,
    enableBeforeUnload: unfinished,
    withResolver: true,
  });
  if (blocker.status !== 'blocked') return null;
  return (
    <Dialog
      compact
      title={l.title}
      glyph={{ tone: 'neutral', shape: 'hollow' }}
      description={l.body}
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

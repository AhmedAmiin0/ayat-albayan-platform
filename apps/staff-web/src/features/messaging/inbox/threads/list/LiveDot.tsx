import { liveDotState, type LiveDotState } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { useInboxLive } from '@/features/messaging/inbox/api/live';

/** The dot's colour (existing tokens, no palette change) and the words a screen reader hears. */
const looks: Record<LiveDotState, { tone: string; label: string }> = {
  on: { tone: 'bg-ok', label: t.inbox.liveOn },
  off: { tone: 'bg-danger', label: t.inbox.liveOff },
};

/** Down means it rejoins with backoff while polls keep the inbox current (docs/44 K2). */
export function LiveDot() {
  const state = liveDotState(useInboxLive());
  const { tone, label } = looks[state];
  return (
    <span role="img" aria-label={label} data-testid="live-dot" data-state={state} title={label} className="inline-flex p-1">
      <span className={cn('size-2 rounded-full', tone)} />
    </span>
  );
}

import { liveDotState, type LiveDotState } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { useInboxLive } from '@/features/messaging/inbox/api/live';

/** The dot's colour (existing tokens, no palette change) and the words a screen reader hears. */
const looks: Record<LiveDotState, { tone: string; label: string }> = {
  on: { tone: 'bg-ok', label: t.inbox.liveOn },
  off: { tone: 'bg-danger', label: t.inbox.liveOff },
};

/**
 * The live dot beside the chats list's title (docs/44 K2, like Kapso): green while the realtime
 * channel is SUBSCRIBED, red while it is down (it rejoins with backoff meanwhile and the polls keep
 * the inbox current). Its name («متصل» / «غير متصل») is in its title and for screen readers.
 */
export function LiveDot() {
  const state = liveDotState(useInboxLive());
  const { tone, label } = looks[state];
  return (
    <span role="status" data-testid="live-dot" data-state={state} title={label} className="inline-flex p-1">
      <span aria-hidden className={cn('size-2 rounded-full', tone)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

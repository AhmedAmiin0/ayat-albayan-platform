import { callClock, callStatusText, type CallPhase, type CallSession } from '@ab/client-core';
import type { ActiveCallView } from '@ab/shared';
import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';

export interface CallBarProps {
  session: CallSession;
  row: ActiveCallView | undefined;
  phase: CallPhase;
  onExpand: () => void;
}

/**
 * The minimised call (docs/28 §5): a pill floating above the page's lower edge (and the phone composer),
 * so the app header and its navigation stay reachable; tap to go back to the call.
 */
export function CallBar({ session, row, phase, onExpand }: CallBarProps) {
  const now = useSyncExternalStore(phase === 'active' ? callClock.subscribe : callClock.still, callClock.read);
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`${t.calls.controls.expand}: ${session.name}`}
      className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex min-h-11 w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:bg-primary-hover"
    >
      <Icon name="call" className="size-4" />
      <span className="truncate">{session.name}</span>
      <span aria-hidden="true">·</span>
      <span aria-hidden="true" className="tabular-nums" dir={phase === 'active' ? 'ltr' : undefined}>
        {callStatusText(phase, { row, now, text: t.calls })}
      </span>
    </button>
  );
}

import type { ActiveCallView } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import type { CallPhase, CallSession } from '../state/call-phase';
import { callStatusText } from './call-status';
import { useNow } from './use-now';

export interface CallBarProps {
  session: CallSession;
  row: ActiveCallView | undefined;
  phase: CallPhase;
  onExpand: () => void;
}

/** The minimised call (docs/28 §5): a slim green bar on top of every page, tap to go back to the call. */
export function CallBar({ session, row, phase, onExpand }: CallBarProps) {
  const now = useNow(phase === 'active');
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`${t.calls.controls.expand}: ${session.name}`}
      className="fixed inset-x-0 top-0 z-[60] flex min-h-10 items-center justify-center gap-2 bg-ok px-4 pt-[env(safe-area-inset-top)] text-sm font-semibold text-destructive-foreground"
    >
      <Icon name="call" className="size-4" />
      <span className="truncate">{session.name}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums" dir={phase === 'active' ? 'ltr' : undefined}>
        {callStatusText(phase, { row, now })}
      </span>
    </button>
  );
}

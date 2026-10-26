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

/**
 * The minimised call (docs/28 §5): a pill floating above the page's lower edge (and the phone composer),
 * so the app header and its navigation stay reachable; tap to go back to the call.
 */
export function CallBar({ session, row, phase, onExpand }: CallBarProps) {
  const now = useNow(phase === 'active');
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
        {callStatusText(phase, { row, now })}
      </span>
    </button>
  );
}

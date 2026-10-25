import type { ThreadView } from '@ab/shared';
import { useEffect, useState } from 'react';
import { StatusChip } from '@/components/ui/display/status-chip';
import { useInboxMode } from '../../shared/mode';
import { windowText } from './window-state';

const MINUTE = 60_000;

/**
 * The thread's 24 h window, always visible in the header: open with the hours left, or closed with
 * what reopens it (in this inbox mode's words). Re-renders every minute so «تبقّى» counts down while the thread stays open.
 * `compact`: one line in the phone header's sideways-scrolling chip row.
 */
export function WindowBanner({ thread, compact }: { thread: Pick<ThreadView, 'last_inbound_at'>; compact?: boolean }) {
  const mode = useInboxMode();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MINUTE);
    return () => clearInterval(id);
  }, []);
  const { open, text } = windowText(thread.last_inbound_at, now, mode);
  return (
    <span data-testid="window-banner" data-open={open}>
      <StatusChip size="sm" tone={open ? 'ok' : 'act'} glyph={open ? 'fill' : 'hollow'} label={text} className={compact ? undefined : 'h-auto min-h-[22px] whitespace-normal py-1'} />
    </span>
  );
}

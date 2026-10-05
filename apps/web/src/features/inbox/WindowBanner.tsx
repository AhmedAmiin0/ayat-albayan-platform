import type { ThreadView } from '@ab/shared';
import { useEffect, useState } from 'react';
import { StatusChip } from '@/components/ui/status-chip';
import { windowText } from './window-state';

const MINUTE = 60_000;

/**
 * The thread's 24 h window, always visible in the header: open with the hours left, or closed with
 * what reopens it. Re-renders every minute so «تبقّى» counts down while the thread stays open.
 */
export function WindowBanner({ thread }: { thread: Pick<ThreadView, 'last_inbound_at'> }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MINUTE);
    return () => clearInterval(id);
  }, []);
  const { open, text } = windowText(thread.last_inbound_at, now);
  return (
    <span data-testid="window-banner" data-open={open}>
      <StatusChip size="sm" tone={open ? 'ok' : 'act'} glyph={open ? 'fill' : 'hollow'} label={text} className="h-auto min-h-[22px] whitespace-normal py-1" />
    </span>
  );
}

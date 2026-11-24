import type { ThreadView } from '@ab/shared';
import { useEffect, useState } from 'react';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { windowText } from './window-state';

const MINUTE = 60_000;

/** Re-renders every minute so the remaining time counts down. */
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

import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit';

const BESIDE = '@3xl/thread:grid-cols-[minmax(0,1fr)_clamp(260px,32%,340px)]';
// Below 48rem the panel opens as ThreadSideSheet, so the log stays the thread's only scroller.
const SIDE = 'hidden @3xl/thread:flex @3xl/thread:min-h-0 @3xl/thread:flex-col';

export interface ThreadPaneWideProps {
  /** The heading's id (ThreadHeader's h2): the section's accessible name. */
  labelledBy: string;
  header: ReactNode;
  /** The message log, filling its column from 900px. */
  log: ReactNode;
  /** The composer, or a read-only line. */
  reply: ReactNode;
  /** Whether the thread has a lead / family panel to show beside the chat from 48rem. */
  aside: boolean;
  side: ReactNode;
  toast: ReactNode;
}

/**
 * ThreadPane from 900px: the header, then the log with the reply box pinned under it, and the side
 * panel (when `aside`). The panel sits beside the chat only when the thread itself is 48rem wide,
 * so the chat never drops under about 30rem; narrower, the header opens it as a sheet (docs/66 §2).
 */
export function ThreadPaneWide({
  labelledBy,
  header,
  log,
  reply,
  aside,
  side,
  toast,
}: ThreadPaneWideProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="@container/thread min-w-0 shell:flex shell:h-full shell:min-h-0 shell:flex-col"
    >
      {header}
      <div
        className={cn(
          'grid gap-6 shell:min-h-0 shell:flex-1 shell:grid-rows-[minmax(0,1fr)]',
          aside && BESIDE,
        )}
      >
        {/* The log scrolls, the reply box stays pinned under it. */}
        <div className="min-w-0 shell:flex shell:min-h-0 shell:flex-col">
          {log}
          {reply}
        </div>
        {aside && (
          <div data-thread-side className={SIDE}>
            {side}
          </div>
        )}
      </div>
      {toast}
    </section>
  );
}

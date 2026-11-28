import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit';

const BESIDE = cn(
  'shell:overflow-y-auto shell:overscroll-contain',
  '@3xl/thread:grid-cols-[minmax(0,1fr)_clamp(260px,32%,340px)]',
  '@3xl/thread:grid-rows-[minmax(0,1fr)] @3xl/thread:overflow-visible',
);
const CHAT_BESIDE = '@3xl/thread:flex @3xl/thread:min-h-0 @3xl/thread:flex-col';

export interface ThreadPaneWideProps {
  /** The heading's id (ThreadHeader's h2): the section's accessible name. */
  labelledBy: string;
  header: ReactNode;
  /** The message log, already sized for the layout (fill 'beside' with a panel, else 'shell'). */
  log: ReactNode;
  /** The composer, or a read-only line. */
  reply: ReactNode;
  /** Whether the lead / family panel shows beside (from 1280px) or below the chat. */
  aside: boolean;
  side: ReactNode;
  toast: ReactNode;
}

/**
 * ThreadPane from 640px: the header, then the log with the reply box pinned under it, and the side
 * panel (when `aside`). The panel sits beside the chat only when the thread itself is 48rem wide,
 * so the chat never drops under about 30rem; narrower, the panel folds under it (docs/65 UX-5).
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
          'grid gap-6 shell:min-h-0 shell:flex-1',
          aside ? BESIDE : 'shell:grid-rows-[minmax(0,1fr)]',
        )}
      >
        {/* The log scrolls, the reply box stays pinned under it. */}
        <div className={cn('min-w-0', aside ? CHAT_BESIDE : 'shell:flex shell:min-h-0 shell:flex-col')}>
          {log}
          {reply}
        </div>
        {aside && side}
      </div>
      {toast}
    </section>
  );
}

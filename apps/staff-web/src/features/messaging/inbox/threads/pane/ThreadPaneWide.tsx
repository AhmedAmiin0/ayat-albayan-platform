import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ThreadPaneWideProps {
  /** The heading's id (ThreadHeader's h2): the section's accessible name. */
  labelledBy: string;
  header: ReactNode;
  /** The message log, already sized for the layout (fill 'xl' beside a panel, else 'shell'). */
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
 * panel (when `aside`) in one scrolling column below 1280px, beside the chat from it.
 */
export function ThreadPaneWide({ labelledBy, header, log, reply, aside, side, toast }: ThreadPaneWideProps) {
  return (
    <section aria-labelledby={labelledBy} className="min-w-0 shell:flex shell:h-full shell:min-h-0 shell:flex-col">
      {header}
      <div
        className={cn(
          'grid gap-6 shell:min-h-0 shell:flex-1',
          // With the side panel: one scrolling column below 1280px, three columns from it.
          aside
            ? 'shell:overflow-y-auto shell:overscroll-contain xl:grid-cols-[minmax(0,1fr)_340px] xl:grid-rows-[minmax(0,1fr)] xl:overflow-visible'
            : 'shell:grid-rows-[minmax(0,1fr)]',
        )}
      >
        {/* The log scrolls, the reply box stays pinned under it. */}
        <div className={cn('min-w-0', aside ? 'xl:flex xl:min-h-0 xl:flex-col' : 'shell:flex shell:min-h-0 shell:flex-col')}>
          {log}
          {reply}
        </div>
        {aside && side}
      </div>
      {toast}
    </section>
  );
}

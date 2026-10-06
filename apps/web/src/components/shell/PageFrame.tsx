import type { ReactNode } from 'react';
import { Page } from '@/components/ui/page';
import { cn } from '@/lib/utils';
import { useRailBox } from '../use-rail-box';

// The page's own scroll area: the cartouche row stays pinned and a table keeps its header in view.
// A flex column, so a screen can hand the rest of the height to one box (`flex-1 min-h-0`: the
// inbox, a fixed-height table) that then scrolls on its own. -mx-1 px-1: a scroll box clips what is
// drawn outside its edge, and a full-width control's focus ring (2px outline + 2px offset) is
// exactly that; the 4px of padding keeps the ring visible and the negative margin keeps the layout.
// Phones: room under the last control, so a toast (fixed at the bottom) never sits on top of it.
export const SCROLL = cn(
  'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain -mx-1 px-1 max-sm:pb-16',
  '[&_[data-page-head]]:sticky [&_[data-page-head]]:top-0 [&_[data-page-head]]:z-10 [&_[data-page-head]]:bg-page',
  '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[1] [&_thead_th]:bg-page',
);

/**
 * The work page inside a viewport-high layout (owner, 2026-10-05: "don't make the page scroll"):
 * the browser page never scrolls, only this frame's content does (and boxes inside it).
 */
export function PageFrame({ children, pageClassName }: { children: ReactNode; pageClassName?: string }) {
  const scroll = useRailBox<HTMLDivElement>();
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Page className={cn('flex min-h-0 flex-1 flex-col', pageClassName)}>
        {/* data-page-scroll: the e2e probes read this box (horizontal overflow stays inside it, not the document). */}
        <div ref={scroll} data-page-scroll className={SCROLL}>
          {children}
        </div>
      </Page>
    </main>
  );
}

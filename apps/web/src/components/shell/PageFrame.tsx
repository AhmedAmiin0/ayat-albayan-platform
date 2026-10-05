import type { ReactNode } from 'react';
import { Page } from '@/components/ui/page';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { useRailBox } from '../use-rail-box';

// The page's own scroll area: the cartouche row stays pinned and a table keeps its header in view.
// A flex column, so a screen can hand the rest of the height to one box (`flex-1 min-h-0`: the
// inbox, a fixed-height table) that then scrolls on its own.
export const SCROLL = cn(
  'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain',
  '[&_[data-page-head]]:sticky [&_[data-page-head]]:top-0 [&_[data-page-head]]:z-10 [&_[data-page-head]]:bg-page',
  '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[1] [&_thead_th]:bg-page',
);

/**
 * The work page inside a viewport-high layout (owner, 2026-10-05: "don't make the page scroll"):
 * the browser page never scrolls, only this frame's content does (and boxes inside it).
 */
export function PageFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const scroll = useRailBox<HTMLDivElement>();
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Page className="flex min-h-0 flex-1 flex-col">
        <div ref={scroll} className={SCROLL}>
          {children}
          {footer}
        </div>
      </Page>
    </main>
  );
}

/** The theme choice under the page where the bar has no room for it (phones). */
export function PhoneTheme({ className }: { className: string }) {
  return (
    <div className={cn('flex shrink-0 justify-center pt-4', className)}>
      <ThemeToggle />
    </div>
  );
}

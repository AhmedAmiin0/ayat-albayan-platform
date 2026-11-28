import { ThemeToggle, cn } from '@ab/web-kit';
import type { HeadPrefsProps } from './HeadPrefs.types';

/** The compact theme switch for a header row; the web has no time-format switch (12 h only). */
export function HeadPrefs({ className }: HeadPrefsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-1.5', className)}>
      <ThemeToggle size="compact" />
    </div>
  );
}

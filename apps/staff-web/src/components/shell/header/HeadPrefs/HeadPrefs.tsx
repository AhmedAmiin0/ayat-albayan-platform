import { ClockToggle, ThemeToggle, cn } from '@ab/web-kit';
import type { HeadPrefsProps } from './HeadPrefs.types';

/** The theme and time-format switches, compact, for a header row; the account page keeps labels. */
export function HeadPrefs({ className }: HeadPrefsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-1.5', className)}>
      <ThemeToggle size="compact" />
      <ClockToggle size="compact" />
    </div>
  );
}

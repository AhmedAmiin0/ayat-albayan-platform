import { cn } from '@ab/web-kit';

// The staff fihris idiom (apps/staff-web AdminNav): on the rail an item is a 44px row, the current
// one a page-white tile with a 4px lapis bar at the inline-start; on a phone's bottom bar the
// current one sits on the green wash.
export const ITEM = cn(
  'group ab-press relative z-10 flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5',
  'rounded-md px-1 text-2xs font-medium text-ink-2 transition-[color,transform]',
  'duration-(--duration-press) ease-ink',
  'hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink',
  'shell:min-h-11 shell:flex-row shell:justify-start shell:gap-2.5 shell:px-3',
  'shell:text-sm shell:text-cover-ink',
);

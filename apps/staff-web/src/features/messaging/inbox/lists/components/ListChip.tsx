import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Shaped like the toolbar's filter chips (ActiveFilterChips): a hairline pill, 32px from 640px with a
// fine pointer, the 44px touch floor on phones and coarse pointers. The chosen one wears the mint
// wash and the primary edge (radio-chips' checked look).
export const CHIP_CLASS = [
  'inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs whitespace-nowrap',
  'transition-colors duration-[120ms] hover:bg-sunk motion-safe:active:scale-[0.98] max-sm:min-h-11 max-sm:px-4 pointer-coarse:min-h-11',
].join(' ');

export interface ListChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The list the chip row shows (aria-pressed). */
  pressed: boolean;
}

/** One chip of the «القوائم» row: a toggle button, pressed while its list is shown. */
export function ListChip({ pressed, className, ...props }: ListChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        CHIP_CLASS,
        pressed ? 'border-primary bg-lapis-wash font-semibold text-ink' : 'border-rule-strong bg-card text-ink-2',
        className,
      )}
      {...props}
    />
  );
}

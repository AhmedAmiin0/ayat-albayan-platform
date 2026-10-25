import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// The work page (docs/07 §6 Card/Page): a flat card, 1px rule and an 8px radius with a hairline
// shadow (owner, 2026-10-05: simplify; no gold outline). Never nested, nothing boxed inside it.
// `@container` so tables can fold the hamish column with `@max-[940px]:` variants. On phones
// (< 640px, owner 2026-10-05: "simpler") the page is the screen itself: no frame, margin or shadow.
export const jadwalClass =
  'rounded-md border border-rule bg-card shadow-page';

export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        '@container relative m-1.5 min-w-0 px-4 pt-5 pb-4 shell:px-7 shell:pt-6 shell:pb-6',
        jadwalClass,
        'max-sm:m-0 max-sm:rounded-none max-sm:border-0 max-sm:px-3 max-sm:pt-4 max-sm:shadow-none',
        className,
      )}
      {...props}
    />
  );
}

/** Title row inside a Page: cartouche, count, then actions pushed to the inline-end. */
export function PageHead({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-page-head className={cn('mb-5 flex flex-wrap items-center gap-x-4 gap-y-3', className)} {...props} />;
}

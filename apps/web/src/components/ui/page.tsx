import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// The work page (docs/07 §6 Card/Page): a jadwal frame, ink rule + gold outline 4px outside,
// never rounded beyond 2px, never nested, nothing boxed inside it (group with space and rules).
// `@container` so tables can fold the hamish column with `@max-[940px]:` variants.
export const jadwalClass =
  'border border-rule-strong bg-card outline-[1.5px] outline-offset-4 outline-gold outline-solid rounded-xs';

export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('@container relative m-1.5 min-w-0 px-4 pt-[18px] pb-3.5 shell:px-6 shell:pt-[22px] shell:pb-[18px]', jadwalClass, className)}
      {...props}
    />
  );
}

/** Title row inside a Page: cartouche, count, then actions pushed to the inline-end. */
export function PageHead({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-page-head className={cn('mb-5 flex flex-wrap items-center gap-x-4 gap-y-3', className)} {...props} />;
}

import { cn } from '@ab/web-kit/lib/utils';

/** The boards' small gold ◆ (a heading's mark, the middle of the rule); decorative. */
export function Diamond({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rotate-45 bg-gold', className)} />;
}

/** The gold ◆ between two fading hairlines under a section title (boards: every heading). */
export function DiamondRule({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex w-[120px] items-center gap-2.5', className)}>
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-gold ltr:bg-linear-to-r" />
      <Diamond />
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-gold ltr:bg-linear-to-l" />
    </span>
  );
}

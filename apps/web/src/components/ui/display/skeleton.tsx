import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

/** One shimmering placeholder bar (motion.css `.ab-skeleton`; still under reduced motion). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('ab-skeleton block h-4 animate-shimmer rounded-sm', className)} />;
}

export interface ListSkeletonProps {
  /** Placeholder rows; a list page shows about one screenful. */
  rows?: number;
  /** Spoken while loading; defaults to «جاري التحميل…». */
  label?: string;
  className?: string;
}

/**
 * Loading state of a list or table: a few row-shaped bars in place of the old «جاري التحميل…» line.
 * role=status + aria-busy, and the words stay for screen readers (and for tests that look for them).
 */
export function ListSkeleton({ rows = 4, label = t.common.loading, className }: ListSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cn('grid gap-3 py-4', className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} aria-hidden="true" className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <span className="grid flex-1 gap-2">
            <Skeleton className={i % 2 ? 'w-2/3' : 'w-1/2'} />
            <Skeleton className="h-3 w-1/3" />
          </span>
        </span>
      ))}
    </div>
  );
}

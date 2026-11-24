import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

/** One shimmering placeholder bar (motion.css `.ab-skeleton`; still under reduced motion). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('ab-skeleton block h-4 animate-shimmer rounded-sm', className)} />;
}

export interface ListSkeletonProps {
  /** Placeholder rows; a list page shows about one screenful. */
  rows?: number;
  /** Spoken while loading. */
  label?: string;
  className?: string;
}

/** role=status with aria-busy; the words stay for screen readers and tests. */
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

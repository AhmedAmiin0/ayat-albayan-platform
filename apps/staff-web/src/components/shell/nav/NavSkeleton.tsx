import { Skeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

export interface NavSkeletonProps {
  /** `column`: the admin sidebar; `row`: the teacher and sales top bar. */
  layout?: 'column' | 'row';
}

/** Placeholders while /auth/me loads (docs/27 E2), never a partial menu. */
export function NavSkeleton({ layout = 'column' }: NavSkeletonProps) {
  const row = layout === 'row';
  return (
    <div role="status" aria-busy="true" data-testid="nav-skeleton" className={cn('flex gap-3 p-3', row ? 'flex-row items-center' : 'flex-col')}>
      <span className="sr-only">{t.common.loading}</span>
      {Array.from({ length: row ? 4 : 7 }, (_, i) => (
        <Skeleton key={i} className={row ? 'h-5 w-20' : cn('h-5', i % 3 ? 'w-3/4' : 'w-1/2')} />
      ))}
    </div>
  );
}

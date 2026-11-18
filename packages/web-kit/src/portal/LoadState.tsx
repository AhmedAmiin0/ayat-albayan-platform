import type { ReactNode } from 'react';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** The family look: the skeleton rows on a white card (boards' row cards). */
const FAM_LOADING =
  'family:rounded-[20px] family:border family:border-rule family:bg-raised family:px-5 family:shadow-fam-card';

/** What LoadState reads of a useQuery or useInfiniteQuery result. */
interface LoadQuery<T> {
  data: T | undefined;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

interface Props<T> {
  query: LoadQuery<T>;
  children: (data: T) => ReactNode;
  /** Skeleton rows while loading. */
  rows?: number;
}

/**
 * A panel's data once loaded (a background re-read keeps showing it); until then its skeleton,
 * or «تعذّر تحميل البيانات» with a retry.
 */
export function LoadState<T>({ query, children, rows }: Props<T>) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (!query.isError) return <ListSkeleton rows={rows} className={FAM_LOADING} />;
  return (
    <FormAlert className="family:items-center family:rounded-2xl family:px-4 family:py-3">
      {t.portal.loadFailed}{' '}
      <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
        {t.portal.retry}
      </Button>
    </FormAlert>
  );
}

import type { ReactNode } from 'react';
import { ListSkeleton, Skeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { queryStateOf } from './query-state';
import type { QueryStateKind, QueryStateProps } from './QueryState.types';

const quietBars = (
  <div aria-busy="true" className="grid gap-3 py-4">
    <span className="sr-only">{t.common.loading}</span>
    {[0, 1, 2, 3].map((i) => (
      <Skeleton key={i} className={i % 2 ? 'w-2/3' : 'w-1/2'} />
    ))}
  </div>
);

/** The data is kept while a background re-read runs or fails. */
export function QueryState<T>(props: QueryStateProps<T>) {
  const { query, children, rows, quiet, isEmpty } = props;
  const skeleton = quiet ? quietBars : <ListSkeleton rows={rows} />;
  const errorLine = (
    <FormAlert>
      {props.errorText ?? t.common.loadFailed}{' '}
      <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
        {t.common.retry}
      </Button>
    </FormAlert>
  );
  const views: Record<QueryStateKind, () => ReactNode> = {
    loading: () => props.loading ?? skeleton,
    error: () => props.error ?? errorLine,
    empty: () => props.empty ?? null,
    data: () => query.data !== undefined && children(query.data),
  };
  return <>{views[queryStateOf(query, isEmpty)]()}</>;
}

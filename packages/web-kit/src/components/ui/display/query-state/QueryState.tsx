import type { ReactNode } from 'react';
import { ListSkeleton, Skeleton } from '#/components/ui/display/skeleton.tsx';
import { Button } from '#/components/ui/form/button.tsx';
import { FormAlert } from '#/components/ui/form/form-alert.tsx';
import { t } from '#/lib/i18n/index.ts';
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

/**
 * A panel's read in one of four states: a skeleton, an error line with «إعادة المحاولة», an
 * empty state, or the data (kept while a background re-read runs or fails).
 */
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

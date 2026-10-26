import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';

/** A panel's loading skeleton and «تعذّر تحميل البيانات» with a retry; the children once loaded. */
export function LoadState<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) {
    return (
      <FormAlert>
        {t.portal.loadFailed}{' '}
        <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
          {t.portal.retry}
        </Button>
      </FormAlert>
    );
  }
  return <>{children(query.data)}</>;
}

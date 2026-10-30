import type { UseQueryResult } from '@tanstack/react-query';
import type { RowData } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/form/button';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';

export interface PortalListProps<T extends RowData> {
  /** The table's accessible name (the page title and its view filter are the page's: ViewHead). */
  title: string;
  query: UseQueryResult<T[]>;
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** The empty state: what is missing and how the list fills. */
  empty: { title: string; hint: string };
}

/** The shell of the assistant's read-only lists: loading, a failed load with a retry, the empty state, the table. */
export function PortalList<T extends RowData>({ title, query, columns, getRowId, empty }: PortalListProps<T>): ReactNode {
  return (
    <>
      {query.isPending && <ListSkeleton />}
      {query.isError && (
        <FormAlert>
          {t.sales.loadFailed}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t.sales.retry}
          </Button>
        </FormAlert>
      )}
      {query.data?.length === 0 && <EmptyState title={empty.title}>{empty.hint}</EmptyState>}
      {query.data && query.data.length > 0 && (
        <DataTable stacked clientSort clientFilter label={title} columns={columns} data={query.data} getRowId={getRowId} />
      )}
    </>
  );
}

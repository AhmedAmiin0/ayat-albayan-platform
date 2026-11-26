import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { TableBox } from '@/components/data-table/TableBox';
import { EmptyState, FormAlert, ListSkeleton, t } from '@ab/web-kit';
import { assistantsQuery } from './api';
import { assistantColumns } from './assistant-columns';

/** R-ASST-05. */
export function AssistantsList() {
  const list = useQuery(assistantsQuery);
  const columns = useMemo(() => assistantColumns(), []);
  if (list.isPending) return <ListSkeleton />;
  if (list.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (list.data.length === 0) {
    return (
      <TableBox center>
        <EmptyState title={t.assistants.empty} />
      </TableBox>
    );
  }
  return (
    <DataTable
      fill
      stacked
      clientSort
      clientFilter
      columns={columns}
      data={list.data}
      getRowId={(r) => r.id}
    />
  );
}

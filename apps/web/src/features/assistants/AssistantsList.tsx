import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { assistantsQuery } from './api';
import { assistantColumns } from './assistant-columns';

/** «فريق المبيعات»: each salesperson with their salary and commission terms (R-ASST-05). */
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
  return <DataTable fill stacked clientSort clientFilter columns={columns} data={list.data} getRowId={(r) => r.id} />;
}

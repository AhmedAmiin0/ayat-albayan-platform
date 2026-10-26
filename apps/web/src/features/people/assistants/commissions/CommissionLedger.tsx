import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { ASSISTANT_COMMISSION_STATUSES } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { commissionsQuery, type AssistantCommissionView, type AssistantRow } from '../api';
import { commissionColumns } from './commission-columns';
import { CurrencyList } from './CurrencyList';
import { FilterBar, type Filter } from '../students/FilterBar';
import { sumByCurrency } from '../statements/totals';
import { VoidCommissionDialog } from './VoidCommissionDialog';

type Props = {
  /** The list for the filter; omit on one assistant's page and pass `assistantId`. */
  assistants?: readonly AssistantRow[] | undefined;
  assistantId?: string;
  canWrite: boolean;
};

const STATUSES = ASSISTANT_COMMISSION_STATUSES.map((value) => ({ value, label: t.assistants.ledger.status[value] }));

/** «العمولات» (R-ASST-02, R-ASST-05): the ledger with assistant / month / status filters and per-currency totals. */
export function CommissionLedger({ assistants, assistantId = '', canWrite }: Props) {
  const [filter, setFilter] = useState<Filter<'earned' | 'voided'>>({ assistantId, month: '', status: '' });
  const list = useQuery(commissionsQuery({ ...filter, assistantId: assistantId || filter.assistantId }));
  const [voiding, setVoiding] = useState<AssistantCommissionView | null>(null);
  const columns = useMemo(() => commissionColumns({ canWrite, onVoid: setVoiding }), [canWrite]);
  const rows = list.data ?? [];
  // Voided commissions are history: the total counts what is still earned.
  const totals = sumByCurrency(rows, (r) => r.status === 'earned');

  return (
    <>
      <FilterBar label={t.assistants.ledger.filters} value={filter} onChange={setFilter} statuses={STATUSES} assistants={assistantId ? undefined : assistants} anyMonth />
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {list.isSuccess && rows.length === 0 && (
        <TableBox center>
          <EmptyState title={t.assistants.ledger.empty} />
        </TableBox>
      )}
      {rows.length > 0 && (
        <>
          <DataTable fill stacked clientSort clientFilter columns={columns} data={rows} getRowId={(r) => r.id} />
          <div className="mt-3 flex items-baseline justify-end gap-3 text-sm">
            <span className="text-ink-3">{t.assistants.ledger.total}</span>
            <CurrencyList totals={totals} />
          </div>
        </>
      )}
      {voiding && <VoidCommissionDialog commission={voiding} onClose={() => setVoiding(null)} />}
    </>
  );
}

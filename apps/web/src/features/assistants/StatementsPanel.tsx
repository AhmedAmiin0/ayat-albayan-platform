import { PAYOUT_STATUSES } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { ListSkeleton } from '@/components/ui/skeleton';
import { currentMonth } from '@/features/payouts/api';
import { t } from '@/lib/i18n';
import { ASSISTANTS_KEY, approveStatement, generateStatement, statementReceiptUrl, statementsQuery, type AssistantRow, type StatementFilter } from './api';
import { FilterBar } from './FilterBar';
import { generateTargets } from './generate-targets';
import { statementColumns } from './statement-columns';
import type { StatementCan } from './StatementActions';
import { StatementDialogs, type StatementDialog } from './StatementDialogs';
import { errorText } from './status';

type Props = {
  assistants: readonly AssistantRow[];
  /** One assistant's own page: no assistant filter. */
  assistantId?: string;
  can: StatementCan;
};

const STATUSES = PAYOUT_STATUSES.map((value) => ({ value, label: t.enums.payoutStatus[value] }));

/** «الكشوف الشهرية» (R-ASST-03): a month's statements per assistant: generate, approve, pay with receipt, reopen, un-pay. */
export function StatementsPanel({ assistants, assistantId = '', can }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatementFilter>({ assistantId, month: currentMonth(), status: '' });
  const query = { ...filter, assistantId: assistantId || filter.assistantId };
  const list = useQuery(statementsQuery(query));
  const [dialog, setDialog] = useState<StatementDialog | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
  const rows = useMemo(() => list.data ?? [], [list.data]);

  const generate = useMutation({
    mutationFn: async () => {
      const ids = query.assistantId ? [query.assistantId] : assistants.map((a) => a.id);
      const results = await Promise.allSettled(generateTargets(ids, rows).map((id) => generateStatement({ assistantId: id, month: filter.month })));
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) throw failed.reason;
    },
    onSettled: refresh,
  });
  const approve = useMutation({ mutationFn: approveStatement, onSuccess: refresh });
  const receipt = useMutation({ mutationFn: statementReceiptUrl, onSuccess: (r) => void window.open(r.url, '_blank', 'noopener') });
  const [doApprove, doReceipt] = [approve.mutate, receipt.mutate];
  const columns = useMemo(
    () =>
      statementColumns({
        can,
        onAction: (s, action) => {
          if (action === 'approve') doApprove(s.id);
          else if (action === 'receipt') doReceipt(s.id);
          else setDialog({ statement: s, kind: action });
        },
      }),
    [can, doApprove, doReceipt],
  );
  const error = generate.error ?? approve.error ?? receipt.error;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterBar label={t.assistants.statements.filters} value={filter} onChange={setFilter} statuses={STATUSES} assistants={assistantId ? undefined : assistants} />
        {can.write && (
          <Button type="button" variant="secondary" className="mb-4" disabled={generate.isPending || assistants.length === 0} onClick={() => generate.mutate()}>
            {rows.length > 0 ? t.assistants.statements.regenerate : t.assistants.statements.generate}
          </Button>
        )}
      </div>
      {error && <FormAlert>{errorText(error)}</FormAlert>}
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {list.isSuccess && rows.length === 0 && (
        <TableBox center>
          <EmptyState title={t.assistants.statements.empty} />
        </TableBox>
      )}
      {rows.length > 0 && <DataTable fill stacked clientSort clientFilter columns={columns} data={rows} getRowId={(r) => r.id} />}
      {dialog && <StatementDialogs open={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

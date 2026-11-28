import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Cartouche, QueryState, FormAlert, PageHead, t } from '@ab/web-kit';
import { downloadCsv } from '@/features/reporting/exports';
import { receivablesQuery } from './api';
import { ReceivablesBody } from './ReceivablesBody';

export function ReceivablesPage() {
  const q = useQuery(receivablesQuery);
  const csv = useMutation({ mutationFn: () => downloadCsv({ kind: 'receivables' }) });
  return (
    <>
      <PageHead>
        <Cartouche>{t.finance.receivablesTitle}</Cartouche>
        <div className="ms-auto">
          <Button type="button" variant="secondary" disabled={csv.isPending} onClick={() => csv.mutate()}>
            {t.payouts.exportCsv}
          </Button>
        </div>
      </PageHead>
      {csv.isError && <FormAlert>{t.common.error}</FormAlert>}
      <QueryState query={q}>
        {(view) => <ReceivablesBody view={view} />}
      </QueryState>
    </>
  );
}

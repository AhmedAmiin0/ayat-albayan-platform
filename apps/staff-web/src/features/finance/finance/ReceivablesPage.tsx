import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { downloadCsv } from '@/features/reporting/exports/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { receivablesQuery } from './api';
import { ReceivablesBody } from './ReceivablesBody';

/**
 * /admin/receivables «مستحق على الطلاب»: who owes, how much, days since the package started, aging;
 * CSV; every column sorts and filters.
 */
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

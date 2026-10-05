import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast } from '@/components/ui/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { paymentsQuery, type PaymentView } from './api';
import { paymentColumns } from './payment-columns';
import { ReceiptDialog } from './ReceiptDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';

type Props = { page: number; onPage: (page: number) => void };

/** /admin/payments (R-PAY-01): newest first, record a payment with its receipt, preview receipts. */
export function PaymentsPage({ page, onPage }: Props) {
  const list = useQuery(paymentsQuery(page));
  const [recording, setRecording] = useState(false);
  const [receipt, setReceipt] = useState<PaymentView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const columns = useMemo(() => paymentColumns({ onReceipt: setReceipt }), []);

  return (
    <>
      <PageHead>
        <Cartouche>{t.payments.title}</Cartouche>
        <div className="ms-auto">
          <Button onClick={() => setRecording(true)}>
            <Icon name="plus" />
            {t.payments.record}
          </Button>
        </div>
      </PageHead>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {list.data?.total === 0 && <EmptyState title={t.payments.empty} />}
      {list.data && list.data.total > 0 && (
        <>
          <DataTable stacked columns={columns} data={list.data.items} getRowId={(r) => r.id} />
          <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={onPage} />
        </>
      )}
      {recording && (
        <RecordPaymentDialog
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            setToast(t.payments.saved);
          }}
        />
      )}
      {receipt && <ReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

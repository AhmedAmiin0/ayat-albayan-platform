import { DataTable } from '@/components/data-table/DataTable';
import { Cartouche, EmptyState, FormAlert, PageHead, Pager, Toast, t } from '@ab/web-kit';
import { RecordPaymentDialog } from '@/features/finance/payments';
import type { InvoicesPageProps } from './InvoicesPage.types';
import { useInvoicesPage } from './use-invoices-page';

/** Every booking invoice (R-PAY-03); range, sort and filters live in the URL. */
export function InvoicesPage(props: InvoicesPageProps) {
  const { list, table, toast, payment, ...page } = useInvoicesPage(props);
  return (
    <>
      <PageHead>
        <Cartouche>{t.finance.invoicesTitle}</Cartouche>
      </PageHead>
      {page.showError && <FormAlert>{t.common.error}</FormAlert>}
      {page.bare && <EmptyState title={t.finance.noInvoices} />}
      {table && (
        <DataTable
          stacked
          columns={page.columns}
          data={table.items}
          getRowId={(i) => i.id}
          emptyText={t.finance.noInvoices}
          sort={page.sort}
          filters={page.filters}
          toolbar={page.toolbar}
        />
      )}
      {list.data && (
        <Pager
          page={list.data.page}
          total={list.data.total}
          pageSize={list.data.pageSize}
          onPage={page.toPage}
        />
      )}
      {payment && (
        <RecordPaymentDialog
          invoiceId={payment.invoiceId}
          student={payment.student}
          onClose={page.closePayment}
          onSaved={page.paymentSaved}
        />
      )}
      {toast && <Toast message={toast} onDismiss={page.dismissToast} />}
    </>
  );
}

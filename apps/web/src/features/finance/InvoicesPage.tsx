import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast } from '@/components/ui/toast';
import { formatDate } from '@/features/leads/format';
import { RecordPaymentDialog } from '@/features/payments/RecordPaymentDialog';
import { t } from '@/lib/i18n';
import { invoiceDownload, invoicesQuery, type InvoiceView } from './api';

/** /admin/invoices: every booking invoice (R-PAY-03), newest first; open the file or «سجّل كدفعة». */
export function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const list = useQuery(invoicesQuery({ page, ...range }));
  const [paying, setPaying] = useState<InvoiceView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const open = useMutation({ mutationFn: invoiceDownload, onSuccess: (r) => void window.open(r.url, '_blank', 'noopener') });
  const set = (patch: { from?: string; to?: string }) => (setRange((r) => ({ ...r, ...patch })), setPage(1));
  const student = paying?.students[0];
  return (
    <>
      <PageHead>
        <Cartouche>{t.finance.invoicesTitle}</Cartouche>
      </PageHead>
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <Field label={t.finance.from}>{(p) => <Input {...p} type="date" dir="ltr" onChange={(e) => set({ from: e.target.value || undefined })} />}</Field>
        <Field label={t.finance.to}>{(p) => <Input {...p} type="date" dir="ltr" onChange={(e) => set({ to: e.target.value || undefined })} />}</Field>
      </div>
      {(list.isError || open.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {list.data?.total === 0 && <EmptyState title={t.finance.noInvoices} />}
      <ul className="grid divide-y divide-rule">
        {list.data?.items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
            <span className="tabular-nums text-ink-2">{formatDate(i.created_at)}</span>
            <span className="min-w-40 font-semibold text-ink">{i.students.map((s) => s.name).join('، ') || '—'}</span>
            <span className="text-xs text-ink-3">{i.kind === 'makeup' ? t.finance.invoiceMakeup : t.finance.invoicePackage}</span>
            {i.payment_id ? <span className="text-xs font-semibold text-ink-2">{t.finance.invoicePaid}</span> : null}
            <span className="ms-auto flex gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => open.mutate(i.id)}>
                {t.finance.openInvoice}
              </Button>
              {!i.payment_id && i.students.length > 0 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setPaying(i)}>
                  {t.finance.recordFromInvoice}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {list.data && <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={setPage} />}
      {paying && student && (
        <RecordPaymentDialog
          invoiceId={paying.id}
          student={student}
          onClose={() => setPaying(null)}
          onSaved={() => (setPaying(null), setToast(t.payments.saved))}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

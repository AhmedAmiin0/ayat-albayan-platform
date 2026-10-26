import type { MyPaymentRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AttachmentsDialog } from '@/features/finance/payments/attachments/AttachmentsDialog';
import { studentLabel } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { myPaymentsQuery } from '../api';
import { myPaymentColumns } from './my-payment-columns';
import { PortalList } from '../students/PortalList';

/** «مدفوعاتي» on /sales/earnings: the payments I recorded and no others (the API answers only for me). */
export function MyPayments() {
  const [open, setOpen] = useState<MyPaymentRow | null>(null);
  const columns = useMemo(() => myPaymentColumns({ onAttachments: setOpen }), []);
  return (
    <>
      <PortalList
        title={t.assistantPortal.payments.title}
        query={useQuery(myPaymentsQuery)}
        columns={columns}
        getRowId={(p) => p.id}
        empty={{ title: t.assistantPortal.payments.empty, hint: t.assistantPortal.payments.emptyHint }}
      />
      {open && (
        <AttachmentsDialog
          path={`/sales/me/payments/${open.id}/attachments`}
          description={studentLabel(open.student)}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

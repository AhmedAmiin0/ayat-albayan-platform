import type { MyPaymentRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AttachmentsDialog } from '@/features/finance/payments/attachments/AttachmentsDialog';
import { studentLabel } from '@/features/finance/subscriptions';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { myPaymentsQuery } from '@/features/sales/sales/api';
import { MyPaymentAmount } from './MyPaymentAmount';
import { myPaymentColumns } from './my-payment-columns';
import { PortalList } from '@/features/sales/sales/students/PortalList';

/**
 * «مدفوعاتي» on /sales/earnings: the payments I recorded and no others (the API answers only for
 * me). «تعديل المبلغ» only with payments.edit_amount (owner 2026-11-02).
 */
export function MyPayments() {
  const [open, setOpen] = useState<MyPaymentRow | null>(null);
  const [editing, setEditing] = useState<MyPaymentRow | null>(null);
  const canEdit = usePermissions().can('payments.edit_amount');
  const columns = myPaymentColumns({ onAttachments: setOpen, onEditAmount: canEdit ? setEditing : null });
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
      {editing && <MyPaymentAmount payment={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

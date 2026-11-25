import type { MyPaymentRow } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AttachmentsDialog } from '@/features/finance/payments/attachments/AttachmentsDialog';
import { studentLabel } from '@/features/finance/subscriptions';
import { usePermissions } from '@/features/people/auth';
import { t } from '@ab/web-kit';
import { myPaymentsQuery } from '@/features/sales/sales/api';
import { MyPaymentAmount } from '@/features/sales/sales/money/MyPaymentAmount';
import { myPaymentColumns } from '@/features/sales/sales/money/my-payment-columns';
import { PortalList } from '@/features/sales/sales/students/PortalList';

/** The API answers only for me; amount edits need subscriptions.edit_terms. */
export function MyPayments() {
  const [open, setOpen] = useState<MyPaymentRow | null>(null);
  const [editing, setEditing] = useState<MyPaymentRow | null>(null);
  const canEdit = usePermissions().can('subscriptions.edit_terms');
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

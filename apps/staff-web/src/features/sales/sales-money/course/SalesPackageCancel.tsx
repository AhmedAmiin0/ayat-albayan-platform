import { packageCancelOffered } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { CancelPackageDialog } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  cancelAnyPackage,
  salesPackageCancelQuery,
  useRefreshAfterPackageCancel,
} from './package-cancel-api';

interface SalesPackageCancelProps {
  studentId: string;
  subscriptionId: string;
  label: string;
  onDone: (message: string) => void;
}

/** Needs subscriptions.stop; shown only when the server's check (no lessons or payments) allows. */
export function SalesPackageCancel(props: SalesPackageCancelProps) {
  const { studentId, subscriptionId, label, onDone } = props;
  // The server gates it (subscriptions.stop): a 403 without the key hides the button too.
  const check = useQuery(salesPackageCancelQuery(subscriptionId));
  const [open, setOpen] = useState(false);
  const refresh = useRefreshAfterPackageCancel(studentId);
  if (!packageCancelOffered(check.data)) return null;
  return (
    <>
      <Button type="button" variant="danger-quiet" onClick={() => setOpen(true)}>
        {t.subscriptions.cancel.action}
      </Button>
      {open && (
        <CancelPackageDialog
          label={label}
          cancel={(body) => cancelAnyPackage(subscriptionId, body)}
          staleKey={['sales']}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            void refresh();
            onDone(t.subscriptions.cancel.done);
          }}
        />
      )}
    </>
  );
}

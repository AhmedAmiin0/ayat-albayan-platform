import { packageCancelOffered } from '@ab/client-core';
import { useState } from 'react';
import { useHolds, t } from '@ab/mobile-kit';
import { Note } from '@/more';
import { CancelPackage } from '@/payments';
import { cancelAnyPackage, packageCancelStale, usePackageCancelCheck } from './student-api';

interface PackageCancelActionProps {
  studentId: string;
  /** The current package (`current_id`); null: none. */
  subscriptionId: string | null;
}

/** Shown only when the server's cancel check (no lessons, no payments) passes. */
export function PackageCancelAction({ studentId, subscriptionId }: PackageCancelActionProps) {
  const allowed = useHolds('subscriptions.stop');
  const check = usePackageCancelCheck({ subscriptionId, enabled: allowed });
  const [done, setDone] = useState(false);
  if (done) return <Note>{t.subscriptions.cancel.done}</Note>;
  if (!allowed || subscriptionId === null || !packageCancelOffered(check.data)) return null;
  return (
    <CancelPackage
      cancel={(body) => cancelAnyPackage(subscriptionId, body)}
      stale={packageCancelStale(studentId)}
      onDone={() => setDone(true)}
    />
  );
}

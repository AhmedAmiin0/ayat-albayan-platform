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

/**
 * «إلغاء الباقة» next to «إلغاء الاشتراك» (owner 2026-11-02): subscriptions.stop, ANY student,
 * shown only when the server's check (the cancel's own: no lessons, no payments) lets it run;
 * the confirm, the optional reason and the 409 words are the admin's (CancelPackage).
 */
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

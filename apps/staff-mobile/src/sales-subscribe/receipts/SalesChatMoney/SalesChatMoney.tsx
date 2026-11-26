import type { ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useHolds, t } from '@ab/mobile-kit';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { openPackages, useSalesFamily } from '@/sales-subscribe/lib/family';

/** One money pill on a family chat (R-ASST-01/04); needs self.sales_money, never on a lead. */
export function SalesChatMoney({ thread }: { thread: ThreadView | null }) {
  const allowed = useHolds('self.sales_money');
  const base = useTreeBase();
  const phone = thread?.guardian_id ? thread.phone_e164 : '';
  const family = useSalesFamily(phone, allowed);
  if (phone === '' || !family.data?.students.length) return null;
  const tz = thread?.guardian_tz;
  const owed = openPackages(family.data).length > 0;
  const due = family.data.students.filter((s) => s.renew_due);
  const only = due.length === 1 ? due[0] : undefined;
  const renew = due.length > 0 ? { renew: '1' } : {};
  const subscribe = () =>
    router.push(
      inTree(base, {
        pathname: '/inbox/sales-subscribe',
        params: { phone, ...renew, ...(only ? { studentId: only.id } : {}), ...(tz ? { tz } : {}) },
      }),
    );
  return (
    <>
      <PillButton
        label={due.length > 0 ? t.students.renew : t.salesMoney.newSubscription}
        onPress={subscribe}
      />
      {owed ? (
        <PillButton
          label={t.salesMoney.recordTransfer}
          onPress={() =>
            router.push(inTree(base, { pathname: '/inbox/sales-transfer', params: { phone } }))
          }
        />
      ) : null}
    </>
  );
}

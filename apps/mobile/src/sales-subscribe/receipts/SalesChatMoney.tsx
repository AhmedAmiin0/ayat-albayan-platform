import type { ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { openPackages, renewTargets, useSalesFamily } from '../lib/family';
import { PaymentLinkPill } from '../payment-link/PaymentLinkPill';

/**
 * Over a salesperson's chat with a family (R-ASST-01/04, owner 2026-10-12): «جدّد الاشتراك» FIRST for
 * each of hers due for a renewal (the same screen, that child picked and the form prefilled from her last
 * package; owner 2026-10-15/26), «اشتراك جديد» when one of the family's students is hers, and
 * «سجّل تحويلًا بنكيًا» while one of their packages is owed; «رابط دفع» in the Stripe test build only.
 * Needs self.sales_money; nothing on a lead's chat (RegisterFromChat is there) or another's family.
 * Pills in the chat's action strip (SalesChatActions).
 */
export function SalesChatMoney({ thread }: { thread: ThreadView | null }) {
  const allowed = useHolds('self.sales_money');
  const base = useTreeBase();
  const phone = thread?.guardian_id ? thread.phone_e164 : '';
  const family = useSalesFamily(phone, allowed);
  if (phone === '' || !family.data?.students.length) return null;
  const tz = thread?.guardian_tz;
  const owed = openPackages(family.data).length > 0;
  const subscribe = (studentId?: string) =>
    router.push(
      inTree(base, {
        pathname: '/inbox/sales-subscribe',
        params: { phone, ...(studentId ? { studentId, renew: '1' } : {}), ...(tz ? { tz } : {}) },
      }),
    );
  return (
    <>
      {renewTargets(family.data).map((r) => (
        <PillButton key={r.studentId} label={r.label} onPress={() => subscribe(r.studentId)} />
      ))}
      <PillButton label={t.salesMoney.newSubscription} onPress={() => subscribe()} />
      {owed ? (
        <PillButton
          label={t.salesMoney.recordTransfer}
          onPress={() =>
            router.push(inTree(base, { pathname: '/inbox/sales-transfer', params: { phone } }))
          }
        />
      ) : null}
      <PaymentLinkPill phone={phone} />
    </>
  );
}

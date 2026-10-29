import type { ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { openPackages, useSalesFamily } from '../lib/family';

/**
 * Over a salesperson's chat with a family (R-ASST-01/04, owner 2026-10-12): ONE money pill (owner 2026-10-29:
 * no child names on the strip, the child is picked inside): «جدّد الاشتراك» while one of hers is due for a
 * renewal (that child preselected when she is the only one due, the form prefilled from her last package;
 * owner 2026-10-15/26), else «اشتراك جديد»; the payment method (bank transfer, or a Stripe link in the test
 * build) is chosen inside too. «سجّل تحويلًا بنكيًا» while one of their packages is owed. Needs
 * self.sales_money; nothing on a lead's chat («تسجيل طالب جديد» is in «⋮») or another's family.
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
      <PillButton label={due.length > 0 ? t.students.renew : t.salesMoney.newSubscription} onPress={subscribe} />
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

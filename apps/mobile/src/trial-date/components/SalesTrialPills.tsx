import { canPickTrialDate, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { useSalesFamily } from '@/sales-subscribe/family';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { chatTrialHref } from '../lib/trial-href';

/**
 * Over a salesperson's family chat (R-ASST-01): «موعد تجريبي جديد» for each of her students in the
 * family with no running subscription, naming the child when she has several there. It opens the
 * trial-date screen (the history and the wizard) inside the chat's group. A subscriber gets no
 * pill: the screen and the student file say why. Same gate and cached family query as SalesChatMoney.
 */
export function SalesTrialPills({ thread }: { thread: ThreadView | null }) {
  const money = useHolds('self.sales_money');
  const base = useTreeBase();
  const phone = thread?.guardian_id ? thread.phone_e164 : '';
  const family = useSalesFamily(phone, money);
  const students = family.data?.students ?? [];
  const several = students.length > 1;
  return students
    .filter((s) => canPickTrialDate(s.status))
    .map((s) => {
      const label = several ? `${t.trialDate.action} — ${s.name}` : t.trialDate.action;
      return (
        <PillButton
          key={s.id}
          label={label}
          accessibilityLabel={`${t.trialDate.action} — ${s.name}`}
          onPress={() => router.push(inTree(base, chatTrialHref({ studentId: s.id, name: s.name })))}
        />
      );
    });
}

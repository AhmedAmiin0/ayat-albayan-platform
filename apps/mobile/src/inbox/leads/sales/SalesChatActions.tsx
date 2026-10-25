import type { ThreadView } from '@ab/shared';
import { ScrollView } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { useSalesFamily } from '@/sales-subscribe/family';
import { SalesChatMoney } from '@/sales-subscribe/SalesChatMoney';
import { SalesTrialPills } from '@/trial-date/components/SalesTrialPills';
import { RegisterFromChat } from './RegisterFromChat';
import { registerHref } from './register-href';

/**
 * A salesperson's actions over her chat in ONE row of pills (owner 2026-10-18: more room to read):
 * «تسجيل طالب جديد» on a lead, «اشتراك جديد» / «جدّد الاشتراك» / «سجّل تحويلًا بنكيًا» on her family,
 * and «موعد تجريبي جديد» for each of her students there with no running subscription.
 * Scrolls sideways when they overflow the phone's width. Each keeps its own gate; the strip shows
 * only once a pill will (the same gates, the same cached family query): no empty band, no jump.
 */
export function SalesChatActions({ thread }: { thread: ThreadView | null }) {
  const money = useHolds('self.sales_money');
  const family = useSalesFamily(thread?.guardian_id ? thread.phone_e164 : '', money);
  const sells = money && !!thread?.guardian_id && !!family.data?.students.length;
  if (!registerHref(thread) && !sells) return null;
  return (
    <ScrollView
      testID="sales-chat-actions"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, marginHorizontal: -16 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}
    >
      <RegisterFromChat thread={thread} />
      <SalesChatMoney thread={thread} />
      <SalesTrialPills thread={thread} />
    </ScrollView>
  );
}

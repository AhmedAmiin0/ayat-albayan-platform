import type { ThreadView } from '@ab/shared';
import { ScrollView } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { useSalesFamily } from '@/sales-subscribe/lib/family';
import { SalesChatMoney } from '@/sales-subscribe/receipts/SalesChatMoney';
import { SalesTrialPills } from '@/trial-date/components/SalesTrialPills';

/**
 * A salesperson's actions over her family's chat in ONE row of pills (owner 2026-10-18: more room to read):
 * «اشتراك جديد» / «جدّد الاشتراك» / «سجّل تحويلًا بنكيًا», and one «موعد تجريبي جديد» (a sheet picks the child
 * when several have no running subscription). Scrolls sideways when they overflow the phone's width. Each
 * keeps its own gate; the strip shows only once a pill will (the same gates, the same cached family query):
 * no empty band, no jump. A lead's chat has none: «تسجيل طالب جديد» is in the header's «⋮» (owner 2026-10-30).
 */
export function SalesChatActions({ thread }: { thread: ThreadView | null }) {
  const money = useHolds('self.sales_money');
  const family = useSalesFamily(thread?.guardian_id ? thread.phone_e164 : '', money);
  const sells = money && !!thread?.guardian_id && !!family.data?.students.length;
  if (!sells) return null;
  return (
    <ScrollView
      testID="sales-chat-actions"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, marginHorizontal: -16 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}
    >
      <SalesChatMoney thread={thread} />
      <SalesTrialPills thread={thread} />
    </ScrollView>
  );
}

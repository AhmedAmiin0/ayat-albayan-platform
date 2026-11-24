import type { ThreadView } from '@ab/shared';
import { ScrollView } from 'react-native';
import { useHolds } from '@ab/mobile-kit';
import { useSalesFamily } from '@/sales-subscribe/lib/family';
import { SalesChatMoney } from '@/sales-subscribe/receipts/SalesChatMoney';
import { SalesTrialPills } from '@/trial-date/components/SalesTrialPills';

/** Each pill keeps its own gate; the strip shows only once a pill will, so it never jumps. */
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

import type { ThreadView } from '@ab/shared';
import { ScrollView } from 'react-native';
import { SalesChatMoney } from '@/sales-subscribe/SalesChatMoney';
import { RegisterFromChat } from './RegisterFromChat';
import { registerHref } from './register-href';

/**
 * A salesperson's actions over her chat in ONE row of pills (owner 2026-10-18: more room to read):
 * «تسجيل طالب جديد» on a lead, «اشتراك جديد» / «جدّد الاشتراك» / «سجّل تحويلًا بنكيًا» on her family.
 * Scrolls sideways when they overflow the phone's width. Each keeps its own gate; no row on a chat
 * that can have none (a teacher's, an unknown number's).
 */
export function SalesChatActions({ thread }: { thread: ThreadView | null }) {
  if (!registerHref(thread) && !thread?.guardian_id) return null;
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
    </ScrollView>
  );
}

import type { ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { registerHref } from './register-href';

/**
 * Over a salesperson's chat with a lead: «تسجيل طالب جديد» opens the same trial wizard in sales mode
 * (/sales/booking, the student credited to her); after booking, «ارجع للمحادثة» comes back here.
 * In place of the admin's subscription panel (packages and money are not hers). Nothing otherwise.
 * A pill in the chat's action strip (SalesChatActions).
 */
export function RegisterFromChat({ thread }: { thread: ThreadView | null }) {
  const href = registerHref(thread);
  const base = useTreeBase();
  if (!href) return null;
  return <PillButton label={t.inbox.registerNew} onPress={() => router.push(inTree(base, href))} />;
}

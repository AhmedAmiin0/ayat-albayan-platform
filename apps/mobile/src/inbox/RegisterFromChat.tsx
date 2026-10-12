import type { ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { registerHref } from './register-href';

/**
 * Over a salesperson's chat with a lead: «تسجيل طالب جديد» opens the same trial wizard in sales mode
 * (/sales/booking, the student credited to her); after booking, «ارجع للمحادثة» comes back here.
 * In place of the admin's subscription panel (packages and money are not hers). Nothing otherwise.
 */
export function RegisterFromChat({ thread }: { thread: ThreadView | null }) {
  const { color } = useTheme();
  const href = registerHref(thread);
  const base = useTreeBase();
  if (!href) return null;
  return (
    <View style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.rule, alignItems: 'flex-start' }}>
      <Button variant="secondary" label={t.inbox.registerNew} onPress={() => router.push(inTree(base, href))} />
    </View>
  );
}

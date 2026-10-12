import type { ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { openPackages, useSalesFamily } from './family';

/**
 * Over a salesperson's chat with a family (R-ASST-01/04, owner 2026-10-12): «اشتراك جديد» when one
 * of the family's students is hers, and «سجّل تحويلًا بنكيًا» while one of their packages is owed.
 * Needs self.sales_money; nothing on a lead's chat (RegisterFromChat is there) or another's family.
 */
export function SalesChatMoney({ thread }: { thread: ThreadView | null }) {
  const { color } = useTheme();
  const allowed = useHolds('self.sales_money');
  const base = useTreeBase();
  const phone = thread?.guardian_id ? thread.phone_e164 : '';
  const family = useSalesFamily(phone, allowed);
  if (phone === '' || !family.data?.students.length) return null;
  const tz = thread?.guardian_tz;
  const owed = openPackages(family.data).length > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
      }}
    >
      <Button
        variant="secondary"
        label={t.salesMoney.newSubscription}
        onPress={() => router.push(inTree(base, { pathname: '/inbox/sales-subscribe', params: { phone, ...(tz ? { tz } : {}) } }))}
      />
      {owed ? (
        <Button
          variant="secondary"
          label={t.salesMoney.recordTransfer}
          onPress={() => router.push(inTree(base, { pathname: '/inbox/sales-transfer', params: { phone } }))}
        />
      ) : null}
    </View>
  );
}

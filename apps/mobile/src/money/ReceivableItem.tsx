import type { ReceivableRow } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTabOpen } from '@/auth/use-tab-open';
import { t } from '@/lib/i18n';
import { money, paidOf } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ListRow } from '@/core/ui/layout/ListRow';
import { daysLateText, isSevere } from './receivables';

/** Student + code, guardian under it; the amount owed and how late at the inline-end. Opens the payment form (only when the Students tab is open to the role). */
export function ReceivableItem({ row }: { row: ReceivableRow }) {
  const { color } = useTheme();
  const toStudents = useTabOpen('students');
  const late = isSevere(row.days_overdue);
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={[row.guardian?.name, paidOf(row)].filter(Boolean).join(' · ')}
      onPress={toStudents ? () => router.push(`/students/payment/${row.student.id}`) : undefined}
      trailing={
        <View
          accessible
          accessibilityLabel={t.mobileMoney.payFor.replace('{student}', row.student.name)}
          style={{ alignItems: 'flex-end', gap: 2 }}
        >
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink, fontVariant: ['tabular-nums'] }}>
            {money(row.owed, row.currency)}
          </AppText>
          <AppText
            style={{
              fontFamily: late ? type.ui[600] : type.ui[400],
              fontSize: type.size.xs,
              color: late ? color.act : color.ink2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {daysLateText(row.days_overdue)}
          </AppText>
        </View>
      }
    />
  );
}

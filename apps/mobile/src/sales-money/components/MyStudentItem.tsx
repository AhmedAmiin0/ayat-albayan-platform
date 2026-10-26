import type { MyStudentRow } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTreeBase } from '@/core/nav/tree-base';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { instantDay } from '@/payments/format';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { AmountText } from './AmountText';
import { CommissionChip } from './CommissionChip';

const S = t.assistantPortal.students;

/**
 * One student I brought (web my-student-columns): when, whether the first subscription is paid, and
 * my own commission. Never a price or another person's money. In the sales tree a tap opens the
 * student's teacher–family channel, read-only (docs/31 §2: the owning assistant monitors it).
 */
export function MyStudentItem({ student }: { student: MyStudentRow }) {
  const c = student.commission;
  const sales = useTreeBase() === '/sales';
  return (
    <ListRow
      {...(sales && { onPress: () => router.push(`/sales/students/channel/${student.id}`) })}
      title={student.name}
      meta={student.code}
      subtitle={`${S.broughtAt}: ${instantDay(student.brought_at)}`}
      tags={
        c ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Note>{`${S.commission}:`}</Note>
            <AmountText amount={c.amount} currency={c.currency} strong />
            <CommissionChip status={c.status} />
          </View>
        ) : undefined
      }
      trailing={
        student.first_subscription_paid ? (
          <StatusChip size="sm" tone="ok" glyph="fill" label={S.paid} />
        ) : (
          <StatusChip size="sm" tone="act" glyph="hollow" label={S.unpaid} />
        )
      }
    />
  );
}

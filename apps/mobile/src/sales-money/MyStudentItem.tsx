import type { MyStudentRow } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { instantDay } from '@/payments/format';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { AmountText } from './AmountText';
import { CommissionChip } from './CommissionChip';

const S = t.assistantPortal.students;

/**
 * One student I brought (web my-student-columns): when, whether the first subscription is paid, and
 * my own commission. Never a price or another person's money; not a button.
 */
export function MyStudentItem({ student }: { student: MyStudentRow }) {
  const c = student.commission;
  return (
    <ListRow
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

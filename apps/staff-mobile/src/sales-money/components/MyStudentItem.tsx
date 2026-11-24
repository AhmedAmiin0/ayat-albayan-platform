import type { MyStudentRow } from '@ab/shared';
import { router } from 'expo-router';
import { pushInTab } from '@/core/nav/back-within';
import { View } from 'react-native';
import { studentDetailsHref, useTreeBase } from '@/core/nav/tree-base';
import { t, ListRow, StatusChip } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { instantDay } from '@/core/lib/money/format';
import { PhoneText } from '@/core/ui/layout/PhoneText';
import { AmountText } from './AmountText';
import { CommissionChip } from './CommissionChip';
import { useViewerTz } from '@/core/lib/clock';

const S = t.assistantPortal.students;

/** Never a price or another person's money; docs/31 §2 decides which chat a tap opens. */
export function MyStudentItem({ student }: { student: MyStudentRow }) {
  const tz = useViewerTz();
  const c = student.commission;
  const base = useTreeBase();
  const open = () => pushInTab(studentDetailsHref(base, student.id));
  const chat = () => router.push(`/sales/students/channel/${student.id}`);
  return (
    <ListRow
      {...(base === '/sales' && { onPress: chat })}
      titleLink={{ onPress: open, label: t.sales.allStudents.openStudent.replace('{name}', student.name) }}
      title={student.name}
      meta={student.code}
      metaStrong
      subtitle={`${S.broughtAt}: ${instantDay(student.brought_at, tz)}`}
      tags={
        student.guardian_phone || c ? (
          <>
            {student.guardian_phone ? <PhoneText phone={student.guardian_phone} /> : null}
            {c ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Note>{`${S.commission}:`}</Note>
                <AmountText amount={c.amount} currency={c.currency} strong />
                <CommissionChip status={c.status} />
              </View>
            ) : null}
          </>
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

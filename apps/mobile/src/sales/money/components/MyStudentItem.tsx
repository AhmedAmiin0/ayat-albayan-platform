import type { MyStudentRow } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { studentDetailsHref, useTreeBase } from '@/core/nav/tree-base';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { instantDay } from '@/core/lib/money/format';
import { ListRow } from '@/core/ui/layout/ListRow';
import { PhoneText } from '@/core/ui/layout/PhoneText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { AmountText } from './AmountText';
import { CommissionChip } from './CommissionChip';
import { useViewerTz } from '@/core/lib/clock';

const S = t.assistantPortal.students;

/**
 * One student I brought (web my-student-columns): the readable code, the guardian's phone (owner
 * 2026-10-27), when, whether the first subscription is paid, and my own commission. Never a price or
 * another person's money. In the sales tree a tap opens the student's teacher–family channel,
 * read-only (docs/31 §2: the owning assistant monitors it); the name, the row's header, opens the
 * student's file in either tree (owner 2026-10-30).
 */
export function MyStudentItem({ student }: { student: MyStudentRow }) {
  const tz = useViewerTz();
  const c = student.commission;
  const base = useTreeBase();
  const open = () => router.push(studentDetailsHref(base, student.id));
  return (
    <ListRow
      {...(base === '/sales' && { onPress: () => router.push(`/sales/students/channel/${student.id}`) })}
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

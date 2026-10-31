import { studentStatusStyle, type SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { memo } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { studentDetailsHref, useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/more/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { PhoneText } from '@/core/ui/layout/PhoneText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { fill, guardianLine, studentSubtitle } from '@/sales/lib/sales-text';
import { RosterLines } from '@/sales/roster/RosterLines';

const S = t.sales.allStudents;

/**
 * One student of the academy: the name as the row's header (a link to the file) with its readable
 * code, teacher · program, the guardian's phone and name, the current package (size, status,
 * lessons used / left, dates; no price), the weekly schedule and attendance (owner 2026-10-30,
 * RosterLines),
 * the status chip. Never a price, payment, note or meeting link. Every row, in every tree, opens the student's details (owner 2026-10-28: the
 * same tap every time, never the chat): «تفاصيل الطالب» in the sales tree (docs/16 row 36), the
 * admin's student file under «المزيد» › «المبيعات». The family's chat is a button on those screens.
 */
export const AllStudentRow = memo(function AllStudentRow({ student }: { student: SalesStudentView }) {
  const base = useTreeBase();
  const phone = student.guardian_phone;
  const open = () => router.push(studentDetailsHref(base, student.id));
  const status = student.status;
  return (
    <ListRow
      onPress={open}
      titleLink={{ onPress: open, label: fill(S.openStudent, { name: student.name }) }}
      accessibilityHint={S.detailsHint}
      title={student.name}
      meta={student.code}
      metaStrong
      subtitle={studentSubtitle(student)}
      tags={
        <>
          {phone ? <PhoneText phone={phone} /> : null}
          <Note>{guardianLine(student)}</Note>
          <RosterLines student={student} />
        </>
      }
      trailing={
        <StatusChip {...studentStatusStyle[status]} label={t.enums.studentStatus[status]} size="sm" />
      }
    />
  );
});

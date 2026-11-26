import type { SalesStudentView } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { pushInTab } from '@/core/nav/back-within';
import { memo } from 'react';
import { t, ListRow, StatusChip } from '@ab/mobile-kit';
import { studentDetailsHref, useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/core/ui/feedback/Note';
import { PhoneText } from '@/core/ui/layout/PhoneText';
import { fill, guardianLine, studentSubtitle } from '@/sales/sales/lib/sales-text';
import { RosterLines } from '@/sales/sales/roster/RosterLines';

const S = t.sales.allStudents;

/** Never a price, payment, note or meeting link; every row opens the student's details. */
export const AllStudentRow = memo(function AllStudentRow({
  student,
}: {
  student: SalesStudentView;
}) {
  const base = useTreeBase();
  const phone = student.guardian_phone;
  const open = () => pushInTab(studentDetailsHref(base, student.id));
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

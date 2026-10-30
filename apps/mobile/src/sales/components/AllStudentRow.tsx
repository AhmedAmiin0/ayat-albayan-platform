import { studentStatusStyle, type SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { memo } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/core/ui/feedback/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { PhoneText } from '@/core/ui/layout/PhoneText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { studentDetailsHref } from '@/sales/lib/sales-href';
import { guardianLine, studentSubtitle } from '@/sales/lib/sales-text';

/**
 * One student of the academy: name with its readable code, teacher · program, the guardian's phone
 * and name, the status chip. Never a balance, package, note or meeting link. Every row, in every tree,
 * opens the student's details (owner 2026-10-28: the same tap every time, never the chat): «تفاصيل الطالب»
 * in the sales tree (docs/16 row 36), the admin's student file under «المزيد» › «المبيعات». The family's
 * chat is a button on those screens.
 */
export const AllStudentRow = memo(function AllStudentRow({ student }: { student: SalesStudentView }) {
  const base = useTreeBase();
  const phone = student.guardian_phone;
  return (
    <ListRow
      onPress={() => router.push(studentDetailsHref(base, student.id))}
      accessibilityHint={t.sales.allStudents.detailsHint}
      title={student.name}
      meta={student.code}
      metaStrong
      subtitle={studentSubtitle(student)}
      tags={
        <>
          {phone ? <PhoneText phone={phone} /> : null}
          <Note>{guardianLine(student)}</Note>
        </>
      }
      trailing={<StatusChip {...studentStatusStyle[student.status]} label={t.enums.studentStatus[student.status]} size="sm" />}
    />
  );
});

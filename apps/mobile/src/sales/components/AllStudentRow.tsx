import { memo } from 'react';
import { studentStatusStyle, type SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { guardianLine, studentSubtitle } from '../lib/sales-text';

/**
 * One student of the academy (read-only): name and code, teacher · program, the guardian's name, the
 * status chip. Never a balance, package, note, phone or meeting link. One of hers (`mine`) is a button
 * to «تفاصيل الطالب» (docs/16 row 36); any other student is a plain line.
 */
export const AllStudentRow = memo(function AllStudentRow({ student }: { student: SalesStudentView }) {
  return (
    <ListRow
      {...(student.mine && { onPress: () => router.push(`/sales/students/${student.id}`) })}
      title={student.name}
      meta={student.code}
      subtitle={studentSubtitle(student)}
      tags={<Note>{guardianLine(student)}</Note>}
      trailing={<StatusChip {...studentStatusStyle[student.status]} label={t.enums.studentStatus[student.status]} size="sm" />}
    />
  );
});

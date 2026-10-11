import { studentStatusStyle, type SalesStudentView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';
import { guardianLine, studentSubtitle } from './sales-text';

/**
 * One student of the academy (read-only): name and code, teacher · program, the guardian's name, the
 * status chip. Never a balance, package, note, phone or meeting link; not a button (no student file).
 */
export function AllStudentRow({ student }: { student: SalesStudentView }) {
  return (
    <ListRow
      title={student.name}
      meta={student.code}
      subtitle={studentSubtitle(student)}
      tags={<Note>{guardianLine(student)}</Note>}
      trailing={<StatusChip {...studentStatusStyle[student.status]} label={t.enums.studentStatus[student.status]} size="sm" />}
    />
  );
}

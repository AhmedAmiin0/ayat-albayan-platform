import type { TeacherStudentHead } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { Cartouche, Ltr, StatusChip, PageHead, t } from '@ab/web-kit';

/** Nothing about money. */
export function FileHead({ head }: { head: Pick<TeacherStudentHead, 'name' | 'code' | 'status'> }) {
  return (
    <PageHead>
      <Cartouche>{t.teacherFile.title}</Cartouche>
      <span className="font-display text-h3 font-bold">{head.name}</span>
      <Ltr className="text-sm text-ink-2">{head.code}</Ltr>
      <StatusChip
        size="sm"
        {...studentStatusStyle[head.status]}
        label={t.enums.studentStatus[head.status]}
      />
    </PageHead>
  );
}

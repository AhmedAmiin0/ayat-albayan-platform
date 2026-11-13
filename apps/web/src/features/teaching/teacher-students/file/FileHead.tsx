import { studentStatusStyle, type TeacherStudentHead } from '@ab/shared';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { PageHead } from '@/components/ui/layout/page';
import { t } from '@/lib/i18n/i18n';

/** «ملف الطالب», then the student's name, code and status chip. Nothing about money. */
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

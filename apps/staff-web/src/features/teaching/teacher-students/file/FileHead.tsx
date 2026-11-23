import { studentStatusStyle, type TeacherStudentHead } from '@ab/shared';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { t } from '@ab/web-kit/lib/i18n/i18n';

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

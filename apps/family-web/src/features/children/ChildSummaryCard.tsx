import { isSelfChild, reportAt, type ChildSummary } from '@ab/client-core';
import { counted, dateText, type PortalKind, type PortalStudent } from '@ab/shared';
import { Initial } from '@ab/web-kit/family/brand/Initial';
import { pill } from '@ab/web-kit/family/brand/pill';
import { StudentCode } from '@ab/web-kit/family/child/StudentCode';
import { FamilyCard, type CardTone } from '@ab/web-kit/family/layout/FamilyCard';
import { IconTile } from '@ab/web-kit/family/layout/IconTile';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { SummaryFigures } from './SummaryFigures';
import { useChildSummary } from './use-child-summary';

const DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const LAST = 'flex min-h-16 flex-wrap items-center gap-3 rounded-2xl border border-rule bg-sunk px-3.5 py-2.5';

/** «المعلم/ة: …» from the last report, when it names one. */
const teacherOf = (last: ChildSummary['lastReport']): string | null =>
  last?.teacher ? t.portal.app.lesson.teacher.replace('{name}', teacherLabel(last.teacher)) : null;

interface Props {
  student: PortalStudent;
  kind: PortalKind;
  /** «اختر الطالب»: work as this child. */
  onChoose: () => void;
  /** The card's top edge and initial (the boards alternate green and gold). */
  tone?: CardTone;
}

/**
 * One child on «اختر الطالب» (board PortalWebChildren): the initial, the name («أنا» on a
 * guardian's own row), the last report's teacher and the code, «جديد», the last report line, the
 * numbers as stat tiles; its gold pill makes the pages this child's.
 */
export function ChildSummaryCard({ student, kind, onChoose, tone = 'green' }: Props) {
  const { summary, money } = useChildSummary(student, kind);
  const last = summary.lastReport;
  const lastLine = last
    ? t.portal.app.children.lastReport.replace(
        '{date}',
        dateText(new Date(reportAt(last)), { tz: student.tz, locale }, DAY),
      )
    : t.portal.app.children.noReport;
  const teacher = teacherOf(last);
  return (
    <FamilyCard as="article" label={student.name} tone={tone} className="grid content-start gap-4">
      <header className="flex items-center gap-3.5">
        <Initial name={student.name} tone={tone === 'gold' ? 'teal' : 'green'} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h2 className="text-2xl font-extrabold leading-snug text-ink">
            {student.name}
            {isSelfChild(kind, student) && (
              <span className="ms-2 rounded-full bg-fam-mint px-2.5 py-0.5 align-middle text-xs
                font-bold text-fam-mint-ink">{t.portal.app.pick.me}</span>
            )}
          </h2>
          <p className="text-sm text-ink-3">
            {teacher && `${teacher} · `}
            <StudentCode code={student.code} bare />
          </p>
        </div>
      </header>
      <div className={LAST}>
        <IconTile icon="template" />
        <p className="min-w-0 flex-1 basis-36 text-sm font-semibold text-ink-2">{lastLine}</p>
        {summary.newReports > 0 && (
          <span className="whitespace-nowrap rounded-full bg-fam-mint px-3 py-1 text-[13px] font-bold
            text-fam-mint-ink">{counted(t.portal.newReports, summary.newReports)}</span>
        )}
      </div>
      <SummaryFigures summary={summary} money={money} />
      <button type="button" className={pill({ tone: 'gold', size: 'lg' })} onClick={onChoose}>
        {t.portal.openChild}
      </button>
    </FamilyCard>
  );
}

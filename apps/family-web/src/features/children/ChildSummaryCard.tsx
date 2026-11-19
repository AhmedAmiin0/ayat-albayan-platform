import { isSelfChild, reportAt } from '@ab/client-core';
import { counted, dateText, type PortalKind, type PortalStudent } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { SummaryFigures } from './SummaryFigures';
import { ReadState } from './ReadState';
import { useChildSummary } from './use-child-summary';

const DAY = { day: 'numeric', month: 'long' } as const;

interface Props {
  student: PortalStudent;
  kind: PortalKind;
  /** «اختر الطالب»: work as this child. */
  onChoose: () => void;
}

/**
 * One child on «اختر الطالب» (canvas Children): who («أنا» on a guardian's own row), the last
 * report and «جديد», the numbers; its button makes the pages this child's.
 */
export function ChildSummaryCard({ student, kind, onChoose }: Props) {
  const read = useChildSummary(student, kind);
  const { summary, money } = read;
  const last = summary.lastReport;
  const lastLine = last
    ? t.portal.app.children.lastReport.replace(
        '{date}',
        dateText(new Date(reportAt(last)), { tz: student.tz, locale }, DAY),
      )
    : t.portal.app.children.noReport;
  const shownLine = read.loading || read.failed ? null : lastLine;
  return (
    <article aria-label={student.name} className="grid gap-3 rounded-lg border border-rule bg-raised p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 className="font-display text-h3 font-bold">
            {student.name}
            {isSelfChild(kind, student) && (
              <span className="ms-2 text-xs font-semibold text-ink-2">{t.portal.app.pick.me}</span>
            )}
          </h2>
          {shownLine && <p className="text-xs text-ink-3">{shownLine}</p>}
        </div>
        {summary.newReports > 0 && (
          <span className="rounded-sm bg-act-soft px-2 py-0.5 text-xs font-semibold text-act">
            {counted(t.portal.newReports, summary.newReports)}
          </span>
        )}
      </header>
      <ReadState read={read}>
        <SummaryFigures summary={summary} money={money} />
      </ReadState>
      <Button type="button" variant="secondary" className="justify-self-start" onClick={onChoose}>
        {t.portal.openChild}
      </Button>
    </article>
  );
}

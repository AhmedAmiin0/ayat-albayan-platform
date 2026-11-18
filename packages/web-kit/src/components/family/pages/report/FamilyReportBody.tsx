import type { ReportPageView } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { PortalFile } from '@ab/web-kit/portal/report/FileButtons';
import { LinesCard, type LinesLook } from './LinesCard';
import type { ReportCards } from './report-cards';
import { ReportFilesCard } from './ReportFilesCard';

const P = t.familyLook.pages.report;

const CONTENT: LinesLook = {
  id: 'report-content', title: P.content, icon: 'check', tone: 'green', wide: true,
};
const TODO: LinesLook = { id: 'report-todo', title: P.todo, icon: 'clock', tone: 'gold' };
const NOTE: LinesLook = { id: 'report-note', title: P.notes, icon: 'chat', tone: 'teal' };

interface Props {
  view: ReportPageView;
  cards: ReportCards;
  files: { studentId: string; recording: PortalFile[] };
}

/**
 * The report's cards under the band (boards: PortalWebReport): what was read and the teacher's
 * notes beside what to do next and the files; one column on a phone.
 */
export function FamilyReportBody({ view, cards, files }: Props) {
  const edited = view.report.edited_at ? t.reportPage.edited : null;
  return (
    <article aria-label={t.reportPage.title}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="grid gap-6">
        <LinesCard look={CONTENT} lines={cards.content} footer={edited} />
        <LinesCard look={NOTE} lines={cards.note ? [cards.note] : []} />
      </div>
      <div className="grid gap-6">
        <LinesCard look={TODO} lines={cards.todo} />
        <ReportFilesCard view={view} studentId={files.studentId} recording={files.recording} />
      </div>
    </article>
  );
}

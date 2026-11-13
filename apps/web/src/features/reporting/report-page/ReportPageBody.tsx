import { lessonWhenAt, type ReportPageView } from '@ab/shared';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { pageLines } from './page-lines';
import { ReportPageFiles } from './ReportPageFiles';

export interface ReportPageBodyProps {
  view: ReportPageView;
  /** false inside a lesson row (docs/49): the row already says who and when. */
  head?: boolean;
}

/** The saved report, read-only: who and when, its lines, the teacher's files and the PDF. */
export function ReportPageBody({ view, head = true }: ReportPageBodyProps) {
  const clock = useClock();
  const s = t.reportPage;
  const when = lessonWhenAt(new Date(view.lesson.starts_at), { tz: view.tz, ...clock });
  const text = { v2: t.reports.v2, grade: t.enums.grade, program: t.enums.program, lang: locale };
  const lines = pageLines(view.report, { text, v1: t.reports });
  return (
    <article className="grid gap-4" aria-label={s.title}>
      {head && (
        <header className="grid gap-1 border-b border-rule pb-3">
          <p className="text-body font-semibold text-ink">
            {s.lesson.replace('{student}', view.student.name).replace('{date}', when)}
          </p>
          <p className="text-sm text-ink-2">{s.teacher.replace('{name}', view.teacher.name)}</p>
        </header>
      )}
      <dl className="grid gap-3">
        {lines.map((l) => (
          <div
            key={l.key}
            className="grid gap-0.5 border-b border-rule pb-2 sm:grid-cols-[12rem_1fr] sm:gap-4"
          >
            <dt className="text-sm text-ink-3">{l.label}</dt>
            <dd
              className={
                l.value ? 'whitespace-pre-line text-body text-ink' : 'text-body text-ink-3'
              }
            >
              {l.value ?? t.mobileAdmin.reports.noContent}
            </dd>
          </div>
        ))}
      </dl>
      {view.report.edited_at && <p className="text-xs text-ink-3">{s.edited}</p>}
      <ReportPageFiles view={view} />
    </article>
  );
}

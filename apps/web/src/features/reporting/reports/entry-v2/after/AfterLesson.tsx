import { suggestOverall } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { ReportTextField } from '@/features/reporting/reports/entry/ReportTextField';
import type { ReportEntryV2State } from '@/features/reporting/reports/entry-v2/use-report-entry-v2';
import { CARD } from '@/features/reporting/reports/entry-v2/v2-classes';
import { NextPlanCard } from './NextPlanCard';
import { NoteCard } from './NoteCard';
import { OverallCard } from './OverallCard';

/** The attended lesson's end: overall grade, homework, next lesson and the note to the family. */
export function AfterLesson({ s }: { s: ReportEntryV2State }) {
  const v2 = t.reports.v2;
  const { values, shown, report } = s;
  return (
    <>
      <OverallCard
        name={`${report.id}-overall`}
        value={shown.overall}
        suggested={suggestOverall(values.program, values.content)}
        onChange={(g) => s.set('overall', g)}
        invalid={s.problem === 'missing_grades'}
      />
      <section aria-label={v2.homework} className={CARD}>
        <ReportTextField label={v2.homework} value={shown.homework} onChange={(h) => s.set('homework', h)} />
        <p className="text-xs text-ink-3">{v2.homeworkHint}</p>
      </section>
      <NextPlanCard value={shown.nextPlan} edited={values.nextPlan !== null} onChange={(p) => s.set('nextPlan', p)} />
      <NoteCard s={s} report={report} />
    </>
  );
}

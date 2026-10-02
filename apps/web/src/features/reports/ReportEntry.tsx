import { REPORT_RUBRICS, type ReportFormEntry, type ReportFormResponse } from '@ab/shared';
import { t } from '@/lib/i18n';
import { AttachmentsField } from './AttachmentsField';
import { AttendanceField } from './AttendanceField';
import { AFTER_FIELDS, DONE_FIELDS, textRequired, type TextKey } from './form-values';
import { GradePicker } from './GradePicker';
import { IdentityBlock } from './IdentityBlock';
import { ReportEntryFooter } from './ReportEntryFooter';
import { ReportTextField } from './ReportTextField';
import { useReportEntry } from './use-report-entry';

export interface ReportEntryProps {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  /** Heading per student when the lesson has more than one (group / siblings, R-STU-04). */
  titled: boolean;
  /** The viewer's zone for «اتحفظت 17:42» and the edit window. */
  tz: string;
}

/**
 * One student's «تقرير الحلقة» (R-REP-01/02): identity, attendance, what was done, the six rubric
 * grades + overall, notes / homework / next plan, attachments; autosaved while a draft, then sent.
 */
export function ReportEntry({ form, entry, titled, tz }: ReportEntryProps) {
  const s = useReportEntry(entry.report);
  const { report, values } = s;
  const locked = !report.can_edit;
  const title = t.reports.entryFor.replace('{name}', entry.student.name);
  const text = (k: TextKey) => {
    const required = textRequired(k, values.attendance);
    const missing = required && s.problem === 'missing_text' && !values[k].trim();
    return (
      <ReportTextField key={k} label={t.reports[k]} value={values[k]} onChange={(v) => s.set(k, v)} disabled={locked}
        required={required} error={missing ? t.common.required : undefined} />
    );
  };

  return (
    <article aria-label={title} className="grid gap-5">
      {titled && <h2 className="font-display text-h3 font-bold">{title}</h2>}
      <IdentityBlock lesson={form.lesson} entry={entry} />
      <AttendanceField
        name={`${report.id}-attendance`}
        value={values.attendance}
        onChange={(a) => s.set('attendance', a)}
        disabled={locked}
        invalid={s.problem === 'missing_attendance'}
      />
      <section aria-label={t.reports.done} className="grid gap-3">
        <h3 className="font-display text-h3 font-bold">{t.reports.done}</h3>
        <div className="grid gap-3 sm:grid-cols-2">{DONE_FIELDS.map(text)}</div>
      </section>
      <section aria-label={t.reports.rubricTitle} className="grid">
        <h3 className="mb-1 font-display text-h3 font-bold">{t.reports.rubricTitle}</h3>
        {REPORT_RUBRICS.map((r) => (
          <GradePicker key={r} name={`${report.id}-${r}`} label={t.reports.rubric[r]} value={values.grades[r]} onChange={(g) => s.setGrade(r, g)} disabled={locked} />
        ))}
        <GradePicker emphasis name={`${report.id}-overall`} label={t.reports.overall} value={values.overall} onChange={(g) => s.set('overall', g)} disabled={locked} />
      </section>
      <div className="grid gap-3">{AFTER_FIELDS.map(text)}</div>
      <AttachmentsField reportId={report.id} files={report.attachments} onChange={s.setAttachments} editable={!locked} />
      <ReportEntryFooter s={s} block={form.submit_block} tz={tz} />
    </article>
  );
}

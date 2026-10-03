import {
  AFTER_FIELDS,
  attended,
  DONE_FIELDS,
  REPORT_RUBRICS,
  textRequired,
  type ReportFormEntry,
  type ReportFormResponse,
  type TextKey,
} from '@ab/shared';
import { useRef } from 'react';
import { RequiredLegend, RequiredMark } from '@/components/ui/label';
import { t } from '@/lib/i18n';
import { AttachmentsField } from './AttachmentsField';
import { AttendanceField } from './AttendanceField';
import { GradePicker } from './GradePicker';
import { IdentityBlock, MeetingLinkRow } from './IdentityBlock';
import { ProgramField } from './ProgramField';
import { ReportEntryFooter } from './ReportEntryFooter';
import { ReportTextField } from './ReportTextField';
import { useFocusInvalid } from './use-focus-invalid';
import { useReportEntry } from './use-report-entry';

export interface ReportEntryProps {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  /** Heading per student when the lesson has more than one (group / siblings, R-STU-04). */
  titled: boolean;
  /** The viewer's zone for «اتحفظت 17:42» and the edit window. */
  tz: string;
}

const H3 = 'font-display text-h3 font-bold';

/**
 * One student's «تقرير الحلقة» (R-REP-01/02), in the Google Form's sections: «بيانات الحلقة»
 * (identity, program, attendance, link), «محتوى الحلقة», «التقييم التفصيلي» (six rubric grades +
 * overall) and «الملاحظات والواجب» (+ attachments); autosaved while a draft, then sent.
 */
export function ReportEntry({ form, entry, titled, tz }: ReportEntryProps) {
  const s = useReportEntry(entry.report, entry.student.program);
  const { report, values } = s;
  const locked = !report.can_edit;
  const title = t.reports.entryFor.replace('{name}', entry.student.name);
  const article = useRef<HTMLElement>(null);
  useFocusInvalid(article, s.problem);
  // The grades are required once the student attended (or while attendance is still open).
  const gradesRequired = values.attendance === null || attended(values.attendance);
  const gradeMissing = (g: unknown) => gradesRequired && s.problem === 'missing_grades' && !g;
  const text = (k: TextKey) => {
    const required = textRequired(k, values.attendance, report.version);
    const missing = required && s.problem === 'missing_text' && !values[k].trim();
    return (
      <ReportTextField key={k} label={t.reports[k]} value={values[k]} onChange={(v) => s.set(k, v)} disabled={locked}
        required={required} error={missing ? t.common.required : undefined} />
    );
  };

  return (
    <article ref={article} aria-label={title} className="grid gap-5">
      {titled && <h2 className="font-display text-h3 font-bold">{title}</h2>}
      <section aria-label={t.reports.identity} className="grid gap-4">
        <h3 className={H3}>{t.reports.identity}</h3>
        <IdentityBlock lesson={form.lesson} entry={entry} />
        {!locked && <RequiredLegend />}
        <ProgramField name={`${report.id}-program`} value={values.program} onChange={(p) => s.set('program', p)} disabled={locked} />
        <AttendanceField
          name={`${report.id}-attendance`}
          value={values.attendance}
          onChange={(a) => s.set('attendance', a)}
          disabled={locked}
          invalid={s.problem === 'missing_attendance'}
        />
        <MeetingLinkRow lesson={form.lesson} />
      </section>
      <section aria-label={t.reports.done} className="grid gap-3">
        <h3 className={H3}>{t.reports.done}</h3>
        <div className="grid gap-3 sm:grid-cols-2">{DONE_FIELDS.map(text)}</div>
      </section>
      <section aria-label={t.reports.detailTitle} className="grid">
        <h3 className={H3}>{t.reports.detailTitle}</h3>
        <p className="mb-1 mt-3 text-sm font-semibold">
          {t.reports.rubricTitle}
          {gradesRequired && <RequiredMark />}
        </p>
        {REPORT_RUBRICS.map((r) => (
          <GradePicker
            key={r}
            name={`${report.id}-${r}`}
            label={t.reports.rubric[r]}
            value={values.grades[r]}
            onChange={(g) => s.setGrade(r, g)}
            disabled={locked}
            required={gradesRequired}
            invalid={gradeMissing(values.grades[r])}
          />
        ))}
        <GradePicker
          emphasis
          name={`${report.id}-overall`}
          label={t.reports.overall}
          value={values.overall}
          onChange={(g) => s.set('overall', g)}
          disabled={locked}
          required={gradesRequired}
          invalid={gradeMissing(values.overall)}
        />
      </section>
      <section aria-label={t.reports.notesTitle} className="grid gap-3">
        <h3 className={H3}>{t.reports.notesTitle}</h3>
        {AFTER_FIELDS.map(text)}
        <AttachmentsField reportId={report.id} files={report.attachments} onChange={s.setAttachments} editable={!locked} />
      </section>
      <ReportEntryFooter s={s} block={form.submit_block} tz={tz} />
    </article>
  );
}

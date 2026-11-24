import type { ReportFormEntry, ReportFormResponse } from '@ab/shared';
import { ATTENDANCES, PROGRAMS } from '@ab/catalog';
import { useRef } from 'react';
import { RadioChips } from '@ab/web-kit/components/ui/form/radio-chips';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useFocusInvalid } from '@/features/reporting/reports/entry/use-focus-invalid';
import { AbsentCard } from '@/features/reporting/reports/entry-v2/AbsentCard';
import { AfterLesson } from '@/features/reporting/reports/entry-v2/after/AfterLesson';
import { ArabicSection } from '@/features/reporting/reports/entry-v2/programs/ArabicSection';
import { IslamicSection } from '@/features/reporting/reports/entry-v2/programs/IslamicSection';
import { QuranSection } from '@/features/reporting/reports/entry-v2/quran/QuranSection';
import { useReportEntryV2 } from '@/features/reporting/reports/entry-v2/use-report-entry-v2';
import { V2Footer } from '@/features/reporting/reports/entry-v2/V2Footer';
import { V2Header } from '@/features/reporting/reports/entry-v2/V2Header';

export interface ReportEntryV2Props {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  /** Heading per student when the lesson has more than one. */
  titled: boolean;
  /** The viewer's zone for the autosave line and the edit window. */
  tz: string;
  /** Opens a sent report straight in an edit, from the admin's view. */
  opened?: boolean;
}

/** Form version 2 (docs/design/report-form): one card when absent; autosaved while a draft. */
export function ReportEntryV2({ form, entry, titled, tz, opened }: ReportEntryV2Props) {
  const s = useReportEntryV2(entry.report, entry.student.program, opened);
  const { report, values } = s;
  const v2 = t.reports.v2;
  const article = useRef<HTMLElement>(null);
  useFocusInvalid(article, s.problem);
  const title = t.reports.entryFor.replace('{name}', entry.student.name);
  const away = values.attendance === 'absent' || values.attendance === 'excused' ? values.attendance : null;
  const attendance = ATTENDANCES.map((a) => ({ value: a, label: v2.attendance[a] }));
  const programs = PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));
  return (
    <article ref={article} aria-label={title} className="grid max-w-3xl gap-4">
      {titled && <h2 className="font-display text-h3 font-bold">{title}</h2>}
      <V2Header lesson={form.lesson} entry={entry} />
      <fieldset disabled={s.mode.locked} className="grid min-w-0 gap-4">
        <RadioChips name={`${report.id}-attendance`} legend={v2.attendanceTitle} options={attendance} value={values.attendance}
          onChange={(a) => s.set('attendance', a)} invalid={s.problem === 'missing_attendance'} required />
        <RadioChips name={`${report.id}-program`} legend={v2.programTitle} options={programs} value={values.program}
          onChange={(p) => s.set('program', p)} required />
        {away ? (
          <AbsentCard attendance={away} notes={values.notes} onNotes={(n) => s.set('notes', n)} />
        ) : (
          <>
            {values.program === 'quran' && <QuranSection s={s} memory={entry.memory} />}
            {values.program === 'arabic' && <ArabicSection s={s} />}
            {values.program === 'islamic_studies' && <IslamicSection s={s} />}
            <AfterLesson s={s} />
          </>
        )}
      </fieldset>
      <V2Footer s={s} block={form.submit_block} tz={tz} />
    </article>
  );
}

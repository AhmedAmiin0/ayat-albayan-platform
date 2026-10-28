import { ATTENDANCES, PROGRAMS, type ReportFormEntry, type ReportFormResponse } from '@ab/shared';
import { useRef } from 'react';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n/i18n';
import { useFocusInvalid } from '../entry/use-focus-invalid';
import { AbsentCard } from './AbsentCard';
import { AfterLesson } from './after/AfterLesson';
import { ArabicSection } from './programs/ArabicSection';
import { IslamicSection } from './programs/IslamicSection';
import { QuranSection } from './quran/QuranSection';
import { useReportEntryV2 } from './use-report-entry-v2';
import { V2Footer } from './V2Footer';
import { V2Header } from './V2Header';

export interface ReportEntryV2Props {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  /** Heading per student when the lesson has more than one. */
  titled: boolean;
  /** The viewer's zone for the autosave line and the edit window. */
  tz: string;
}

/**
 * The new «تقرير الحلقة» (form_version 2, docs/design/report-form): attendance and program, then
 * the program's content (surah parts, Arabic skills or Islamic studies) and the lesson's end, or
 * one card when the student was absent; autosaved while a draft, then sent.
 */
export function ReportEntryV2({ form, entry, titled, tz }: ReportEntryV2Props) {
  const s = useReportEntryV2(entry.report, entry.student.program);
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
      <fieldset disabled={!report.can_edit} className="grid min-w-0 gap-4">
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

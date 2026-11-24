import {
  AFTER_FIELDS,
  DONE_FIELDS,
  REPORT_RUBRICS,
  textRequired,
  type ReportFormEntry,
  type ReportFormResponse,
  type TextKey,
} from '@ab/shared';
import { ATTENDANCES, PROGRAMS } from '@ab/catalog';
import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';
import { View } from 'react-native';
import { t, Section } from '@ab/mobile-kit';
import { AttachmentsField } from './AttachmentsField';
import { ChoiceChips } from './ChoiceChips';
import { IdentityBlock, MeetingLink } from './IdentityBlock';
import { ReportFooter } from './ReportFooter';
import { ReportTextField } from './ReportTextField';
import { RubricSection } from './RubricSection';
import { LessonFilesLink } from '@/core/nav/LessonFilesLink';
import { useReportEntry } from '@/teacher/report/hooks/use-report-entry';
import { useScrollToInvalid } from '@/teacher/report/hooks/use-scroll-to-invalid';

const attendances = ATTENDANCES.map((a) => ({ value: a, label: t.enums.attendance[a] }));
const programs = PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));

interface ReportEntryCardProps {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  tz: string;
  /** The form's ScrollView: a failed send scrolls to the first invalid question. */
  scroll?: RefObject<ScrollView | null>;
}

/** The Google Form's sections in order (R-REP-01/02); labels verbatim; autosaved while a draft. */
export function ReportEntryCard({ form, entry, tz, scroll }: ReportEntryCardProps) {
  const s = useReportEntry(entry.report, entry.student.program);
  const { report, values } = s;
  const { locked } = s.mode;
  const needsText = (k: TextKey) => textRequired(k, values.attendance, report.version);
  const firstInvalid =
    s.problem === 'missing_attendance'
      ? 'attendance'
      : s.problem === 'missing_grades'
        ? (REPORT_RUBRICS.find((r) => !values.grades[r]) ?? 'overall')
        : s.problem === 'missing_text'
          ? [...DONE_FIELDS, ...AFTER_FIELDS].find((k) => needsText(k) && !values[k].trim()) ?? null
          : null;
  const register = useScrollToInvalid(scroll, { problem: s.problem, firstInvalid });
  const text = (k: TextKey) => (
    <ReportTextField
      key={k}
      label={t.reports[k]}
      value={values[k]}
      onChange={(v) => s.set(k, v)}
      disabled={locked}
      required={needsText(k)}
      invalid={s.problem === 'missing_text' && needsText(k) && !values[k].trim()}
      register={register(k)}
    />
  );
  return (
    <View accessibilityLabel={t.reports.entryFor.replace('{name}', entry.student.name)} style={{ gap: 24 }}>
      <IdentityBlock lesson={form.lesson} entry={entry} />
      <ChoiceChips
        label={t.reports.program}
        items={programs}
        value={s.program}
        onChange={s.setProgram}
        disabled={locked}
        required
      />
      <ChoiceChips
        label={t.reports.attendance}
        items={attendances}
        value={values.attendance}
        onChange={(a) => s.set('attendance', a)}
        disabled={locked}
        invalid={s.problem === 'missing_attendance'}
        required
        register={register('attendance')}
      />
      <MeetingLink lesson={form.lesson} />
      <Section title={t.reports.done}>{DONE_FIELDS.map(text)}</Section>
      <RubricSection s={s} locked={locked} register={register} />
      <Section title={t.reports.notesTitle}>{AFTER_FIELDS.map(text)}</Section>
      <AttachmentsField reportId={report.id} files={report.attachments} onChange={s.setAttachments} editable={!locked} />
      <LessonFilesLink lessonId={form.lesson.id} admin={false} />
      <ReportFooter s={s} block={form.submit_block} tz={tz} />
    </View>
  );
}

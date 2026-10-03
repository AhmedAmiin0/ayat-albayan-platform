import {
  AFTER_FIELDS,
  ATTENDANCES,
  DONE_FIELDS,
  GRADES,
  REPORT_RUBRICS,
  textRequired,
  type ReportFormEntry,
  type ReportFormResponse,
  type TextKey,
} from '@ab/shared';
import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Section } from '@/more/Section';
import { AttachmentsField } from './AttachmentsField';
import { ChoiceChips } from './ChoiceChips';
import { IdentityBlock } from './IdentityBlock';
import { ReportFooter } from './ReportFooter';
import { ReportTextField } from './ReportTextField';
import { useReportEntry } from './use-report-entry';
import { useScrollToInvalid } from './use-scroll-to-invalid';

const attendances = ATTENDANCES.map((a) => ({ value: a, label: t.enums.attendance[a] }));
const grades = GRADES.map((g) => ({ value: g, label: t.enums.grade[g] }));

export interface ReportEntryCardProps {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  /** The teacher's zone for «اتحفظت 17:42» and the edit window. */
  tz: string;
  /** The form's ScrollView: a failed send scrolls to the first invalid question. */
  scroll?: RefObject<ScrollView | null>;
}

/**
 * One student's «تقرير الحلقة» (R-REP-01/02), the Google Form's questions in its order: identity,
 * الحضور, the four done fields, تقييم البنود (six rows + التقدير العام), notes / homework / next
 * plan, attachments. Labels and options verbatim (t.reports, t.enums); autosaved while a draft.
 */
export function ReportEntryCard({ form, entry, tz, scroll }: ReportEntryCardProps) {
  const s = useReportEntry(entry.report);
  const { report, values } = s;
  const locked = !report.can_edit;
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
    <View accessibilityLabel={t.reports.entryFor.replace('{name}', entry.student.name)} style={{ gap: 20 }}>
      <IdentityBlock lesson={form.lesson} entry={entry} />
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
      <Section title={t.reports.done}>{DONE_FIELDS.map(text)}</Section>
      <Section title={t.reports.rubricTitle}>
        {REPORT_RUBRICS.map((r) => (
          <ChoiceChips
            key={r}
            label={t.reports.rubric[r]}
            items={grades}
            value={values.grades[r]}
            onChange={(g) => s.setGrade(r, g)}
            disabled={locked}
            invalid={s.problem === 'missing_grades' && !values.grades[r]}
            required
            register={register(r)}
          />
        ))}
        <ChoiceChips
          label={t.reports.overall}
          items={grades}
          value={values.overall}
          onChange={(g) => s.set('overall', g)}
          disabled={locked}
          invalid={s.problem === 'missing_grades' && !values.overall}
          required
          register={register('overall')}
        />
      </Section>
      <View style={{ gap: 16 }}>{AFTER_FIELDS.map(text)}</View>
      <AttachmentsField reportId={report.id} files={report.attachments} onChange={s.setAttachments} editable={!locked} />
      <ReportFooter s={s} block={form.submit_block} tz={tz} />
    </View>
  );
}

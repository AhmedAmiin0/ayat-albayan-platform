import { ATTENDANCES, GRADES, REPORT_RUBRICS, type ReportFormEntry, type ReportFormResponse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Section } from '@/more/Section';
import { AttachmentsField } from './AttachmentsField';
import { ChoiceChips } from './ChoiceChips';
import { AFTER_FIELDS, DONE_FIELDS, REQUIRED_TEXT, type TextKey } from './form-values';
import { IdentityBlock } from './IdentityBlock';
import { ReportFooter } from './ReportFooter';
import { ReportTextField } from './ReportTextField';
import { useReportEntry } from './use-report-entry';

const attendances = ATTENDANCES.map((a) => ({ value: a, label: t.enums.attendance[a] }));
const grades = GRADES.map((g) => ({ value: g, label: t.enums.grade[g] }));

export interface ReportEntryCardProps {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  /** The teacher's zone for «اتحفظت 17:42» and the edit window. */
  tz: string;
}

/**
 * One student's «تقرير الحلقة» (R-REP-01/02), the Google Form's questions in its order: identity,
 * الحضور, the four done fields, تقييم البنود (six rows + التقدير العام), notes / homework / next
 * plan, attachments. Labels and options verbatim (t.reports, t.enums); autosaved while a draft.
 */
export function ReportEntryCard({ form, entry, tz }: ReportEntryCardProps) {
  const s = useReportEntry(entry.report);
  const { report, values } = s;
  const locked = !report.can_edit;
  const text = (k: TextKey) => (
    <ReportTextField
      key={k}
      label={t.reports[k]}
      value={values[k]}
      onChange={(v) => s.set(k, v)}
      disabled={locked}
      required={REQUIRED_TEXT.includes(k)}
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
        />
      </Section>
      <View style={{ gap: 16 }}>{AFTER_FIELDS.map(text)}</View>
      <AttachmentsField reportId={report.id} files={report.attachments} onChange={s.setAttachments} editable={!locked} />
      <ReportFooter s={s} block={form.submit_block} tz={tz} />
    </View>
  );
}

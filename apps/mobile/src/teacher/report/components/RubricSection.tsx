import { GRADES, REPORT_RUBRICS } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/core/ui/surface/Section';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { ChoiceChips } from './ChoiceChips';
import type { ReportEntryState } from '@/teacher/report/hooks/use-report-entry';

const grades = GRADES.map((g) => ({ value: g, label: t.enums.grade[g] }));

interface RubricSectionProps {
  s: ReportEntryState;
  locked: boolean;
  /** useScrollToInvalid's registrar: a failed send scrolls to the first ungraded row. */
  register: (key: string) => (node: View | null) => void;
}

/**
 * «التقييم التفصيلي»: «تقييم البنود *» (the six rows, each graded ممتاز … يحتاج إلى مراجعة), then
 * «التقدير العام للحلقة *». All required once the student attended (the API's missing_grades).
 */
export function RubricSection({ s, locked, register }: RubricSectionProps) {
  const { values, problem } = s;
  return (
    <Section title={t.reports.detailTitle}>
      <FormLabel required>{t.reports.rubricTitle}</FormLabel>
      {REPORT_RUBRICS.map((r) => (
        <ChoiceChips
          key={r}
          label={t.reports.rubric[r]}
          items={grades}
          value={values.grades[r]}
          onChange={(g) => s.setGrade(r, g)}
          disabled={locked}
          invalid={problem === 'missing_grades' && !values.grades[r]}
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
        invalid={problem === 'missing_grades' && !values.overall}
        required
        register={register('overall')}
      />
    </Section>
  );
}

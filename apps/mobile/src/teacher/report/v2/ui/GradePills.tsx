import { GRADES, type Grade } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Pills } from './Pills';

interface GradePillsProps {
  /** The graded row («التسميع», «القراءة»…); the group is announced «تقييم …». */
  title: string;
  value: Grade | null;
  onChange: (grade: Grade) => void;
  disabled?: boolean;
}

/** The five grades (ممتاز … يحتاج إلى مراجعة) as one radiogroup of chips. */
export function GradePills({ title, value, onChange, disabled }: GradePillsProps) {
  const items = GRADES.map((g) => ({ value: g, label: t.enums.grade[g] }));
  return (
    <Pills
      label={t.reports.v2.rateOf.replace('{title}', title)}
      items={items}
      isOn={(g) => g === value}
      onPress={onChange}
      disabled={disabled}
    />
  );
}

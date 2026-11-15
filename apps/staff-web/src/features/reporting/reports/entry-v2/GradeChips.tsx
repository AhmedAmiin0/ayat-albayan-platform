import { GRADES, type Grade } from '@ab/shared';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n/i18n';

export interface GradeChipsProps {
  /** Radio group name, unique on the page. */
  name: string;
  /** The group's legend: the skill, or «تقييم {title}» under a part's heading. */
  label: string;
  value: Grade | null;
  onChange: (grade: Grade) => void;
  /** missing_grades from the last send, while this row is empty. */
  invalid?: boolean;
}

const options = () => GRADES.map((g) => ({ value: g, label: t.enums.grade[g] }));

/** The five grade chips of a part, skill or rate (ممتاز first), as native radios. */
export function GradeChips({ name, label, value, onChange, invalid }: GradeChipsProps) {
  return (
    <RadioChips name={name} legend={label} options={options()} value={value} onChange={onChange} invalid={invalid === true && value === null} />
  );
}

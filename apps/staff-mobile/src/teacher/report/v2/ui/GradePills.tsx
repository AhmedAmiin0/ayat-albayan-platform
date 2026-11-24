import { GRADES, type Grade } from '@ab/catalog';
import { t } from '@ab/mobile-kit';
import { Pills } from './Pills';

interface GradePillsProps {
  title: string;
  value: Grade | null;
  onChange: (grade: Grade) => void;
  disabled?: boolean;
}

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

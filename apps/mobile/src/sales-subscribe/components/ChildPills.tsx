import type { SalesFamilyStudent } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/more/Section';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { ltr } from '@/core/ui/primitives/Ltr';

export interface ChildPillsProps {
  students: readonly SalesFamilyStudent[];
  /** '' = none picked yet (more than one of hers in the family). */
  value: string;
  onChange: (id: string) => void;
}

/** «اختر الطالب»: only her students of the family, «يوسف · AB-0183». */
export function ChildPills({ students, value, onChange }: ChildPillsProps) {
  return (
    <Section title={t.salesMoney.pickChild}>
      <FilterPills
        wrap
        role="radiogroup"
        accessibilityLabel={t.salesMoney.pickChild}
        items={students.map((s) => ({ value: s.id, label: `${s.name} · ${ltr(s.code)}` }))}
        value={value}
        onChange={onChange}
      />
    </Section>
  );
}

import type { SalesFamilyStudent } from '@ab/shared';
import { t, FilterPills, ltr } from '@ab/mobile-kit';
import { Section } from '@/core/ui/surface/Section';

interface ChildPillsProps {
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

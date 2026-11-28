import type { SalesFamilyStudent } from '@ab/shared';
import { Field, Select, t } from '@ab/web-kit';
import { studentLabel } from '@/features/finance/subscriptions';

interface Props { students: SalesFamilyStudent[]; value: string; onChange: (id: string) => void }

/** Only her students of this family (the API's family view). */
export function ChildPicker({ students, value, onChange }: Props) {
  if (students.length === 0)
    return <p className="text-sm text-ink-2">{t.salesMoney.noOwnStudents}</p>;
  return (
    <Field label={t.salesMoney.pickChild}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          {students.length > 1 && <option value="">{t.salesMoney.pickChild}</option>}
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {studentLabel(s)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

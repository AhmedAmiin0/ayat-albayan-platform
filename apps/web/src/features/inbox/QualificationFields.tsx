import { GENDERS } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import type { QualErrors, QualForm } from './qualification-form';

export interface QualFieldsProps {
  form: QualForm;
  errors: QualErrors;
  onChange: (patch: Partial<QualForm>) => void;
}

type TextKey = 'student_name' | 'country' | 'level' | 'memorized' | 'goal' | 'riwaya';

const TEXT: { key: TextKey; label: string }[] = [
  { key: 'level', label: t.leads.level },
  { key: 'memorized', label: t.leads.memorized },
  { key: 'goal', label: t.leads.goal },
  { key: 'riwaya', label: t.leads.riwaya },
];

/** Who the student is (R-LEAD-03): name, age, gender, country, level, memorized, goal, riwaya. */
export function QualificationFields({ form, errors, onChange }: QualFieldsProps) {
  const text = (key: TextKey, label: string) => (
    <Field key={key} label={label} error={errors[key]}>
      {(p) => <Input {...p} value={form[key]} onChange={(e) => onChange({ [key]: e.target.value })} />}
    </Field>
  );

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
      <div className="col-span-2">{text('student_name', t.leads.studentName)}</div>
      <Field label={t.leads.studentAge} error={errors.age}>
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="numeric"
            min={3}
            max={99}
            dir="ltr"
            value={form.age}
            onChange={(e) => onChange({ age: e.target.value })}
          />
        )}
      </Field>
      <Field label={t.leads.gender} error={errors.gender}>
        {(p) => (
          <Select {...p} value={form.gender} onChange={(e) => onChange({ gender: GENDERS.find((g) => g === e.target.value) ?? '' })}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t.enums.gender[g]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="col-span-2">{text('country', t.leads.country)}</div>
      {TEXT.map(({ key, label }) => text(key, label))}
    </div>
  );
}

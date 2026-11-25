import { LEAD_SOURCES, type LeadSource } from '@ab/catalog';
import { Field, Select, t } from '@ab/web-kit';

export interface SourceFieldProps {
  value: LeadSource | '';
  onChange: (value: LeadSource | '') => void;
}

/** The "other" option is offered only while an existing row already has it. */
export function SourceField({ value, onChange }: SourceFieldProps) {
  return (
    <Field label={t.guardians.source}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(LEAD_SOURCES.find((s) => s === e.target.value) ?? '')}>
          <option value="">—</option>
          {LEAD_SOURCES.filter((s) => s !== 'other' || value === 'other').map((s) => (
            <option key={s} value={s}>
              {t.enums.leadSource[s]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

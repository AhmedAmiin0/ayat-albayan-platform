import { LEAD_SOURCES, type LeadSource } from '@ab/catalog';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { t } from '@ab/web-kit/lib/i18n/i18n';

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

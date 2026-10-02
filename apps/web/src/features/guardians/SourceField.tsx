import { LEAD_SOURCES, type LeadSource } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';

export interface SourceFieldProps {
  value: LeadSource | '';
  onChange: (value: LeadSource | '') => void;
}

/**
 * «عرفت عننا منين؟» with the registration form's options in its order (research-forms item 3);
 * «أخرى» stays for CRM / migrated rows. Optional.
 */
export function SourceField({ value, onChange }: SourceFieldProps) {
  return (
    <Field label={t.guardians.source}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(LEAD_SOURCES.find((s) => s === e.target.value) ?? '')}>
          <option value="">—</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {t.enums.leadSource[s]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

import type { FamilyForm } from '@ab/client-core';
import { Field } from '@/components/ui/form/field';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { TextField } from '@/features/people/students/people-edit/TextField';

const F = t.peopleEdit.fields;

export interface FamilyFieldsProps {
  value: FamilyForm;
  onChange: (patch: Partial<FamilyForm>) => void;
  invalid: readonly string[];
  /** Notes are the admin's only (owner 2026-10-27). */
  notes: boolean;
}

/** «بيانات العائلة»: the guardian's name, main number (E.164), country, zone and (admin) notes. */
export function FamilyFields({ value, onChange, invalid, notes }: FamilyFieldsProps) {
  const error = (key: string) => (invalid.includes(key) ? t.peopleEdit.invalid : undefined);
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 font-semibold">{t.peopleEdit.familySection}</legend>
      <TextField
        label={F.name}
        value={value.name}
        error={error('name')}
        onValue={(name) => onChange({ name })}
      />
      <TextField
        label={F.phone}
        value={value.phone_e164}
        inputMode="tel"
        error={error('phone_e164')}
        onValue={(phone_e164) => onChange({ phone_e164 })}
      />
      <TextField
        label={F.country}
        value={value.country}
        error={error('country')}
        onValue={(country) => onChange({ country })}
      />
      {notes ? (
        <TextField
          label={F.notes}
          value={value.notes}
          error={error('notes')}
          onValue={(v) => onChange({ notes: v })}
        />
      ) : null}
      <Field label={F.tz}>
        {(p) => <TimeZoneSelect {...p} value={value.tz} onValue={(tz) => onChange({ tz })} />}
      </Field>
    </fieldset>
  );
}

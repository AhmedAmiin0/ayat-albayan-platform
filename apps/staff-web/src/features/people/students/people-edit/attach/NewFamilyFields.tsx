import type { NewFamilyForm } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { TextField } from '@/features/people/students/people-edit/TextField';

const E = t.peopleEdit;

export interface NewFamilyFieldsProps {
  value: NewFamilyForm;
  invalid: readonly string[];
  onChange: (patch: Partial<NewFamilyForm>) => void;
  /** Takes this guardian as the move's family (found by the number first on save). */
  onUse: () => void;
}

/** «ولي أمر جديد»: name, WhatsApp number (E.164) and zone. */
export function NewFamilyFields({ value, invalid, onChange, onUse }: NewFamilyFieldsProps) {
  const error = (key: string) => (invalid.includes(key) ? E.invalid : undefined);
  return (
    <fieldset className="grid gap-3 rounded-md border border-input p-3">
      <legend className="px-1 font-semibold">{E.newFamily}</legend>
      <p className="text-sm text-ink-3">{E.newFamilyHint}</p>
      <TextField
        label={E.fields.name}
        value={value.name}
        error={error('name')}
        onValue={(name) => onChange({ name })}
      />
      <TextField
        label={E.fields.phone}
        value={value.phone_e164}
        inputMode="tel"
        error={error('phone_e164')}
        onValue={(phone_e164) => onChange({ phone_e164 })}
      />
      <Field label={E.fields.tz}>
        {(p) => <TimeZoneSelect {...p} value={value.tz} onValue={(tz) => onChange({ tz })} />}
      </Field>
      <Button type="button" variant="secondary" onClick={onUse}>
        {E.newFamily}
      </Button>
    </fieldset>
  );
}

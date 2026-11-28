import type { UserRoleOption } from '@ab/shared';
import { tzChoices, tzOptionLabel } from '@ab/time';
import { t } from '@ab/mobile-kit';
import { Choice } from '@/users/shared/Choice';
import type { EditForm } from './edit-form';
import { RoleFields } from './RoleFields';
import { TextField } from '@/users/shared/TextField';
import type { FormErrors } from '@/users/shared/validation';

export interface UserEditFieldsProps {
  form: EditForm;
  onChange: (next: EditForm) => void;
  errors: FormErrors;
  options: readonly UserRoleOption[];
  readOnly: boolean;
  /** A linked login, or one of a record-backed role, keeps its role (API: role_change_linked). */
  roleLocked: boolean;
}

const city = (id: string): string | undefined => (t.tz as Record<string, string | undefined>)[id];

/** Identity, language, zone (picked, never typed) and role; all disabled without users.write. */
export function UserEditFields({ form, onChange, errors, options, readOnly, roleLocked }: UserEditFieldsProps) {
  const F = t.users.form;
  const set = (patch: Partial<EditForm>) => onChange({ ...form, ...patch });
  const locales = (['ar', 'en'] as const).map((l) => ({ value: l, label: t.language[l], disabled: readOnly }));
  const zones = tzChoices(form.tz).map((id) => ({ value: id, label: tzOptionLabel(id, city(id)), disabled: readOnly }));
  return (
    <>
      <TextField
        label={F.fullName}
        required
        error={errors.full_name}
        editable={!readOnly}
        value={form.full_name}
        onChangeText={(full_name) => set({ full_name })}
      />
      <TextField
        label={F.email}
        required
        ltr
        error={errors.email}
        editable={!readOnly}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.email}
        onChangeText={(email) => set({ email })}
      />
      <TextField
        label={F.phone}
        ltr
        error={errors.phone}
        editable={!readOnly}
        keyboardType="phone-pad"
        value={form.phone}
        onChangeText={(phone) => set({ phone })}
      />
      <Choice label={F.locale} items={locales} value={form.locale} onChange={(locale) => set({ locale })} />
      <Choice label={F.tz} items={zones} value={form.tz} onChange={(tz) => set({ tz })} />
      <RoleFields
        form={form}
        onChange={set}
        errors={errors}
        options={options}
        readOnly={readOnly}
        roleLocked={roleLocked}
      />
    </>
  );
}

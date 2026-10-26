import { tzChoices, tzOptionLabel, type UserRoleOption } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Choice } from '../shared/Choice';
import type { EditForm } from './edit-form';
import { RolePicker } from '../create/RolePicker';
import { TextField } from '../shared/TextField';
import type { FormErrors } from '../shared/validation';

export interface UserEditFieldsProps {
  form: EditForm;
  onChange: (next: EditForm) => void;
  errors: FormErrors;
  options: readonly UserRoleOption[];
  readOnly: boolean;
  /** A login linked to a record keeps its role (API: role_change_linked). */
  roleLocked: boolean;
}

const city = (id: string): string | undefined => (t.tz as Record<string, string | undefined>)[id];

/** The web's UserEditFields: identity, language, zone (picked, never typed) and role; all off without users.write. */
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
      <RolePicker
        role={form.role}
        roleId={form.role_id}
        options={options}
        disabled={readOnly || roleLocked}
        hint={roleLocked ? F.roleLocked : undefined}
        onChange={(next) => set({ role: next.role, role_id: next.roleId })}
      />
    </>
  );
}

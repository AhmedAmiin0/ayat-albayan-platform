import type { UserRoleOption } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n';
import type { EditForm } from './edit-form';
import { RolePicker } from './RolePicker';
import type { FormErrors } from './validation';

const F = t.users.form;

export interface UserEditFieldsProps {
  form: EditForm;
  onChange: (next: EditForm) => void;
  errors: FormErrors;
  options: readonly UserRoleOption[];
  readOnly: boolean;
  /** A login linked to a record keeps its role (API: role_change_linked). */
  roleLocked: boolean;
}

/** The edit panel's fields: identity, language, zone and role. Everything is disabled without users.write. */
export function UserEditFields({ form, onChange, errors, options, readOnly, roleLocked }: UserEditFieldsProps) {
  const set = (patch: Partial<EditForm>) => onChange({ ...form, ...patch });
  return (
    <>
      <Field label={F.fullName} required error={errors.full_name}>
        {(p) => <Input {...p} disabled={readOnly} value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} />}
      </Field>
      <Field label={F.email} required error={errors.email}>
        {(p) => <Input {...p} type="email" dir="ltr" disabled={readOnly} value={form.email} onChange={(e) => set({ email: e.target.value })} />}
      </Field>
      <Field label={F.phone} error={errors.phone}>
        {(p) => <Input {...p} type="tel" dir="ltr" disabled={readOnly} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={F.locale}>
          {(p) => (
            <Select {...p} disabled={readOnly} value={form.locale} onChange={(e) => set({ locale: e.target.value === 'en' ? 'en' : 'ar' })}>
              <option value="ar">{t.language.ar}</option>
              <option value="en">{t.language.en}</option>
            </Select>
          )}
        </Field>
        <Field label={F.tz}>{(p) => <TimeZoneSelect {...p} disabled={readOnly} value={form.tz} onValue={(tz) => set({ tz })} />}</Field>
      </div>
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

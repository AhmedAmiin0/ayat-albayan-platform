import { isLinkedRole, type UserRoleOption } from '@ab/shared';
import { Field, Input, t } from '@ab/web-kit';
import type { CreateForm } from './create-form';
import { CredentialPicker } from './CredentialPicker';
import { RecordFields } from './RecordFields';
import { RolePicker } from './RolePicker';
import type { FormErrors } from '@/features/people/users/validation';

const F = t.users.form;

export interface CreateUserFieldsProps {
  form: CreateForm;
  onChange: (next: CreateForm) => void;
  errors: FormErrors;
  options: readonly UserRoleOption[];
  /** The record came from the page (student profile): it cannot be swapped. */
  lockedLink: boolean;
}

/** The create dialog's fields: identity, role, the linked record, how the password is issued. */
export function CreateUserFields({ form, onChange, errors, options, lockedLink }: CreateUserFieldsProps) {
  const set = (patch: Partial<CreateForm>) => onChange({ ...form, ...patch });
  const linkRole = isLinkedRole(form.role) ? form.role : null;
  return (
    <>
      <Field label={F.fullName} required error={errors.full_name}>
        {(p) => <Input {...p} value={form.full_name} autoComplete="off" onChange={(e) => set({ full_name: e.target.value })} />}
      </Field>
      <Field label={F.email} required error={errors.email}>
        {(p) => <Input {...p} type="email" dir="ltr" autoComplete="off" value={form.email} onChange={(e) => set({ email: e.target.value })} />}
      </Field>
      <Field label={F.phone} error={errors.phone}>
        {(p) => <Input {...p} type="tel" dir="ltr" autoComplete="off" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
      </Field>
      <RolePicker
        role={form.role}
        roleId={form.role_id}
        options={options}
        disabled={lockedLink}
        onChange={(next) => set({ role: next.role, role_id: next.roleId, linked: form.linked?.kind === next.role ? form.linked : null })}
      />
      {linkRole && <RecordFields kind={linkRole} value={form} locked={lockedLink} errors={errors} onChange={set} />}
      <CredentialPicker
        name="create-credential"
        mode={form.credential}
        password={form.password}
        error={errors.password}
        onMode={(credential) => set({ credential })}
        onPassword={(password) => set({ password })}
      />
    </>
  );
}

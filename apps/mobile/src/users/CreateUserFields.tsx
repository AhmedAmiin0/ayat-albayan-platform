import { isLinkedRole, type UserRoleOption } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Choice } from './Choice';
import type { CreateForm } from './create-form';
import { CredentialPicker } from './CredentialPicker';
import { LinkPicker } from './LinkPicker';
import { NewTeacherFields } from './NewTeacherFields';
import { RolePicker } from './RolePicker';
import { TextField } from './TextField';
import type { FormErrors } from './validation';

export interface CreateUserFieldsProps {
  form: CreateForm;
  onChange: (next: CreateForm) => void;
  errors: FormErrors;
  options: readonly UserRoleOption[];
  /** The record came from the student file: it cannot be swapped. */
  lockedLink: boolean;
}

/** The web's CreateUserFields: identity, role, the linked record, how the password is issued. */
export function CreateUserFields({ form, onChange, errors, options, lockedLink }: CreateUserFieldsProps) {
  const F = t.users.form;
  const L = t.users.link;
  const set = (patch: Partial<CreateForm>) => onChange({ ...form, ...patch });
  const linkRole = isLinkedRole(form.role) ? form.role : null;
  const modes = [
    { value: 'existing' as const, label: L.existingTeacher },
    { value: 'new' as const, label: L.newTeacher },
  ];
  return (
    <>
      <TextField label={F.fullName} required error={errors.full_name} value={form.full_name} onChangeText={(full_name) => set({ full_name })} />
      <TextField
        label={F.email}
        required
        ltr
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.email}
        onChangeText={(email) => set({ email })}
      />
      <TextField label={F.phone} ltr error={errors.phone} keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => set({ phone })} />
      <RolePicker
        role={form.role}
        roleId={form.role_id}
        options={options}
        disabled={lockedLink}
        onChange={(next) => set({ role: next.role, role_id: next.roleId, linked: form.linked?.kind === next.role ? form.linked : null })}
      />
      {linkRole === 'teacher' ? (
        <Choice label={L.label} items={modes} value={form.teacherMode} onChange={(teacherMode) => set({ teacherMode })} />
      ) : null}
      {linkRole === 'teacher' && form.teacherMode === 'new' ? (
        <NewTeacherFields value={form.newTeacher} onChange={(newTeacher) => set({ newTeacher })} error={errors.teacher_name} />
      ) : linkRole ? (
        <LinkPicker kind={linkRole} value={form.linked} locked={lockedLink} error={errors.linked} onChange={(linked) => set({ linked })} />
      ) : null}
      <CredentialPicker
        mode={form.credential}
        password={form.password}
        error={errors.password}
        onMode={(credential) => set({ credential })}
        onPassword={(password) => set({ password })}
      />
    </>
  );
}

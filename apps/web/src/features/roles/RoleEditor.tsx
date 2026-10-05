import { USER_ROLES, type RoleCreateInput, type UserRole } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { createRole, ROLES_KEY, roleErrorText, updateRole, type RoleView } from './api';
import { PermissionMatrix } from './PermissionMatrix';
import { emptyForm, formOf, suggestKey, toBody, type RoleForm, type RoleFormErrors } from './role-form';

export interface RoleEditorProps {
  /** The role to edit, or null to create one. */
  role: RoleView | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const baseName = t.roles.base as Record<UserRole, string>;

/** Create or edit a role: names, key, base role and the permission matrix, in an aside dialog. */
export function RoleEditor({ role, onClose, onSaved }: RoleEditorProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [form, setForm] = useState<RoleForm>(() => (role ? formOf(role) : emptyForm()));
  const [keyTouched, setKeyTouched] = useState(false);
  const [errors, setErrors] = useState<RoleFormErrors>({});
  const set = (patch: Partial<RoleForm>) => setForm((f) => ({ ...f, ...patch }));
  const system = role?.is_system === true;
  const hasUsers = (role?.user_count ?? 0) > 0;

  const save = useMutation({
    mutationFn: (body: RoleCreateInput) => (role ? updateRole({ id: role.id, body }) : createRole(body)),
    onSuccess: async () => {
      // /auth/me carries the caller's own permissions: refresh it with the list.
      await Promise.all([queryClient.invalidateQueries({ queryKey: ROLES_KEY }), queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })]);
      onSaved(role ? t.roles.toast.saved : t.roles.toast.created);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = toBody(form);
    setErrors(r.ok ? {} : r.errors);
    if (r.ok) save.mutate(r.body);
  };

  return (
    <Dialog
      title={role ? t.roles.action.editRole.replace('{name}', role.name_ar) : t.roles.newRole}
      onClose={onClose}
      wide
      hint={t.roles.notes.ceiling}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending ? t.common.saving : role ? t.common.save : t.roles.action.create}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.roles.form.nameAr} required error={errors.nameAr}>
            {(p) => <Input {...p} value={form.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />}
          </Field>
          <Field label={t.roles.form.nameEn} required error={errors.nameEn}>
            {(p) => (
              <Input
                {...p}
                dir="ltr"
                value={form.nameEn}
                onChange={(e) => set({ nameEn: e.target.value, ...(role || keyTouched ? {} : { key: suggestKey(e.target.value) }) })}
              />
            )}
          </Field>
          <Field label={t.roles.form.key} hint={t.roles.form.keyHint} required error={errors.key}>
            {(p) => (
              <Input
                {...p}
                dir="ltr"
                value={form.key}
                disabled={!!role}
                onChange={(e) => {
                  setKeyTouched(true);
                  set({ key: e.target.value.trim().toLowerCase() });
                }}
              />
            )}
          </Field>
          <Field label={t.roles.form.baseRole} hint={t.roles.form.baseHint}>
            {(p) => (
              <Select {...p} value={form.base} disabled={system || hasUsers} onChange={(e) => set({ base: e.target.value as UserRole })}>
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {baseName[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {system && <p className="text-xs text-ink-3">{t.roles.notes.systemLocked}</p>}
        <PermissionMatrix value={form.permissions} onChange={(permissions) => set({ permissions })} />
        {save.isError && <FormAlert>{roleErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

import { STAFF_ROLES } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { apiErrorText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { baseRoleLabel, deleteRole, ROLES_KEY, saveRole, type RoleView } from './api';
import { PermissionMatrix } from './PermissionMatrix';
import { RoleResetButton } from './RoleResetButton';
import { fixedGrantsOf, resettableRole, roleBody, roleForm, toggleGroup, togglePermission, type RoleForm } from './role-form';

type Props = { role: RoleView | null; onClose: () => void };
const P = t.permissions.page;

/** Create or edit a role in the side panel: names, base role (fixed once created) and the matrix. */
export function RoleDialog({ role, onClose }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [form, setForm] = useState<RoleForm>(() => roleForm(role));
  const [nameError, setNameError] = useState<string | undefined>();
  const [confirming, setConfirming] = useState(false);
  const [resetError, setResetError] = useState<unknown>(null);
  const fixed = fixedGrantsOf(role);
  const fixedGrants = fixed !== null;
  const resettable = resettableRole(role);
  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    onClose();
  };
  const save = useMutation({ mutationFn: saveRole, onSuccess: done });
  const remove = useMutation({ mutationFn: deleteRole, onSuccess: done });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = roleBody(form, { creating: !role, fixedGrants });
    setNameError(r.ok ? undefined : P.nameRequired);
    if (r.ok) save.mutate({ id: role?.id ?? null, body: r.body });
  };
  const failed = save.error ?? remove.error ?? resetError;

  return (
    <Dialog
      title={role ? P.editRole : P.newRole}
      onClose={onClose}
      wide
      hint={fixed === 'admin' ? P.adminAll : fixed === 'portal' ? P.portalFixed : resettable ? P.systemEditable : undefined}
      actions={
        <>
          {role && !role.is_system && (
            <Button type="button" variant={confirming ? 'danger' : 'danger-quiet'} disabled={remove.isPending} onClick={() => (confirming ? remove.mutate(role.id) : setConfirming(true))}>
              {confirming ? P.deleteConfirm : P.delete}
            </Button>
          )}
          {resettable && (
            <RoleResetButton role={resettable} onReset={(view) => setForm((f) => ({ ...f, permissions: [...view.permissions] }))} onError={setResetError} />
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            {P.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {P.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={P.nameAr} required error={nameError}>
            {(p) => <Input {...p} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />}
          </Field>
          <Field label={P.nameEn}>
            {(p) => <Input {...p} dir="ltr" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />}
          </Field>
        </div>
        <Field label={P.baseRole} hint={role ? P.baseRoleFixed : P.baseRoleHint}>
          {(p) => (
            <Select {...p} value={form.base_role} disabled={!!role} onChange={(e) => setForm({ ...form, base_role: STAFF_ROLES.find((r) => r === e.target.value) ?? 'admin' })}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {baseRoleLabel(r)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <h3 className="text-sm font-bold text-ink">{P.permissions}</h3>
        <PermissionMatrix
          value={form.permissions}
          disabled={fixedGrants}
          onToggle={(p) => setForm((f) => togglePermission(f, p))}
          onToggleGroup={(keys) => setForm((f) => toggleGroup(f, keys))}
        />
        {failed ? <FormAlert>{apiErrorText(failed, { ...P.errors })}</FormAlert> : null}
      </form>
    </Dialog>
  );
}

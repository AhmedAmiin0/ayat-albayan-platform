import type { Permission } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState, type ComponentType } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { peopleEditQuery } from './api';
import { AttachDialog } from './attach/AttachDialog';
import { ConvertDialog } from './convert/ConvertDialog';
import type { PeopleDialogProps } from './dialog-props';
import { EditDataDialog } from './edit/EditDataDialog';

const E = t.peopleEdit;
type Kind = 'edit' | 'attach' | 'convert';

/** Each action, its label, its dialog and the keys it needs (the view itself is people.edit). */
const ACTIONS: {
  kind: Kind;
  label: string;
  needs: Permission[];
  Dialog: ComponentType<PeopleDialogProps>;
}[] = [
  { kind: 'edit', label: E.editData, needs: ['people.edit'], Dialog: EditDataDialog },
  {
    kind: 'attach',
    label: E.attach,
    needs: ['people.edit', 'students.attach_guardian'],
    Dialog: AttachDialog,
  },
  {
    kind: 'convert',
    label: E.convert,
    needs: ['people.edit', 'people.switch_role'],
    Dialog: ConvertDialog,
  },
];

/**
 * «تعديل البيانات» · «ربط بولي أمر آخر» · «تحويل إلى طالب / ولي أمر» (owner 2026-11-02) for one
 * student, on the assistant's «الطلاب» and the admin's student file. Only the actions the role
 * holds; the dialog opens on the loaded edit view; the last success shows under the buttons.
 */
export function PeopleEditActions({ studentId }: { studentId: string }) {
  const { can } = usePermissions();
  const [open, setOpen] = useState<Kind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const view = useQuery({ ...peopleEditQuery(studentId), enabled: open !== null });
  const allowed = ACTIONS.filter((a) => a.needs.every((p) => can(p)));
  if (allowed.length === 0) return null;
  const active = allowed.find((a) => a.kind === open);
  const close = () => setOpen(null);
  const done = (text: string) => {
    setOpen(null);
    setNotice(text);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowed.map((a) => (
        <Button
          key={a.kind}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(a.kind)}
        >
          {a.label}
        </Button>
      ))}
      {active && view.data && <active.Dialog view={view.data} onClose={close} onDone={done} />}
      {active && view.isError && <FormAlert>{E.errors.generic}</FormAlert>}
      {notice && (
        <p role="status" className="text-sm text-ink-2">
          {notice}
        </p>
      )}
    </div>
  );
}

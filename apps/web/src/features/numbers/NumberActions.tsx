import type { NumberView } from '@ab/shared';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/ConfirmSwitchDialog';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { numberErrorText } from './number-errors';
import { deleteNumber, updateNumber } from './numbers-api';
import { NumberFormDialog } from './NumberFormDialog';
import { useNumbersMutation } from './use-numbers-mutation';

const a = t.numbers.actions;

/**
 * A number's buttons (numbers.manage only): edit, enable / disable, make / unset default (enabled
 * numbers only), and delete, offered only once the number is disabled and asked first.
 */
export function NumberActions({ view }: { view: NumberView }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const patch = useNumbersMutation(updateNumber);
  const remove = useNumbersMutation(deleteNumber, { onDone: () => setDeleting(false) });
  const set = (body: Parameters<typeof updateNumber>[0]['body']) => patch.mutate({ id: view.id, body });
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>{a.edit}</Button>
        <Button size="sm" variant="secondary" disabled={patch.isPending} onClick={() => set({ enabled: !view.enabled })}>
          {view.enabled ? a.disable : a.enable}
        </Button>
        {view.is_default && (
          <Button size="sm" variant="ghost" disabled={patch.isPending} onClick={() => set({ is_default: false })}>{a.unsetDefault}</Button>
        )}
        {view.enabled && !view.is_default && (
          <Button size="sm" variant="ghost" disabled={patch.isPending} onClick={() => set({ is_default: true })}>{a.makeDefault}</Button>
        )}
        {!view.enabled && (
          <Button size="sm" variant="danger-quiet" onClick={() => setDeleting(true)}>{a.delete}</Button>
        )}
      </div>
      {patch.isError && <FormAlert>{numberErrorText(patch.error)}</FormAlert>}
      {editing && <NumberFormDialog view={view} onClose={() => setEditing(false)} />}
      {deleting && (
        <ConfirmSwitchDialog
          title={a.delete}
          description={a.deleteConfirm}
          yes={a.delete}
          onYes={() => remove.mutate(view.id)}
          onClose={() => setDeleting(false)}
          pending={remove.isPending}
          failed={false}
        >
          {remove.isError && <FormAlert className="mt-3">{numberErrorText(remove.error)}</FormAlert>}
        </ConfirmSwitchDialog>
      )}
    </div>
  );
}

import type { NumberView } from '@ab/shared';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/ConfirmSwitchDialog';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n';
import { numberErrorText } from './number-errors';
import { deleteNumber, updateNumber } from './numbers-api';
import { NumberFormDialog } from './NumberFormDialog';
import { useNumbersMutation } from './use-numbers-mutation';

const a = t.numbers.actions;

type Body = Parameters<typeof updateNumber>[0]['body'];

/**
 * A number's buttons (numbers.manage only): edit, enable / disable, make / unset default (enabled
 * numbers only), and delete, offered only once the number is disabled. Whatever changes which number a
 * role sends from (turning off or unsetting a default, making one) and delete are asked first.
 */
export function NumberActions({ view }: { view: NumberView }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [asking, setAsking] = useState<{ body: Body; text: string } | null>(null);
  const patch = useNumbersMutation(updateNumber, { onDone: () => setAsking(null) });
  const remove = useNumbersMutation(deleteNumber, { onDone: () => setDeleting(false) });
  const set = (body: Body) => patch.mutate({ id: view.id, body });
  const ask = (body: Body, text: string) => {
    patch.reset();
    setAsking({ body, text });
  };
  const toggle = () => (view.enabled && view.is_default ? ask({ enabled: false }, a.confirmDisableDefault) : set({ enabled: !view.enabled }));
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>{a.edit}</Button>
        <Button size="sm" variant="secondary" disabled={patch.isPending} onClick={toggle}>
          {view.enabled ? a.disable : a.enable}
        </Button>
        {view.is_default && (
          <Button size="sm" variant="ghost" disabled={patch.isPending} onClick={() => ask({ is_default: false }, a.confirmUnsetDefault)}>{a.unsetDefault}</Button>
        )}
        {view.enabled && !view.is_default && (
          <Button size="sm" variant="ghost" disabled={patch.isPending} onClick={() => ask({ is_default: true }, a.confirmMakeDefault)}>{a.makeDefault}</Button>
        )}
        {!view.enabled && (
          <Button size="sm" variant="danger-quiet" onClick={() => setDeleting(true)}>{a.delete}</Button>
        )}
      </div>
      {patch.isError && !asking && <FormAlert>{numberErrorText(patch.error)}</FormAlert>}
      {asking && (
        <ConfirmSwitchDialog
          title={view.label}
          description={asking.text}
          yes={t.common.confirm}
          onYes={() => set(asking.body)}
          onClose={() => setAsking(null)}
          pending={patch.isPending}
          failed={false}
        >
          {patch.isError && <FormAlert className="mt-3">{numberErrorText(patch.error)}</FormAlert>}
        </ConfirmSwitchDialog>
      )}
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

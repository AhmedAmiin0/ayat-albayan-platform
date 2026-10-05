import type { CustomConfigView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { Section } from '../messaging/SettingsSections';
import { customConfigQuery, deleteCustom, putCustom } from './custom-api';
import { draftOf, emptyDraft, matchesCustom } from './custom-form';
import { CustomEntryForm } from './CustomEntryForm';
import { CustomEntryRow } from './CustomEntryRow';

const c = t.config.custom;
type Editing = { entry: CustomConfigView | null } | null;

/** «قيم مخصصة»: add, edit and delete free-form entries (each change is audited by the API). */
export function CustomValuesPanel({ query, onSaved }: { query: string; onSaved: (message: string) => void }) {
  const queryClient = useQueryClient();
  const list = useQuery(customConfigQuery);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: customConfigQuery.queryKey });
  const save = useMutation({
    mutationFn: putCustom,
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      onSaved(c.saved);
    },
  });
  const remove = useMutation({
    mutationFn: deleteCustom,
    onSuccess: async () => {
      await refresh();
      setDeleting(null);
      onSaved(c.deleted);
    },
  });
  const rows = (list.data ?? []).filter((e) => matchesCustom(e, query));
  if (query.trim() !== '' && rows.length === 0 && !editing) return null;
  return (
    <Section id="custom">
      <p className="text-xs text-ink-3">{c.hint}</p>
      {list.isError && <p className="text-sm text-ink-2">{c.loadError}</p>}
      {list.data?.length === 0 && !editing && <p className="text-sm text-ink-3">{c.empty}</p>}
      {rows.length > 0 && (
        <ul>
          {rows.map((e) => (
            <CustomEntryRow key={e.key} entry={e} onEdit={() => setEditing({ entry: e })} onDelete={() => setDeleting(e.key)} />
          ))}
        </ul>
      )}
      {editing ? (
        <CustomEntryForm
          key={editing.entry?.key ?? 'new'}
          initial={editing.entry ? draftOf(editing.entry) : emptyDraft()}
          editing={editing.entry !== null}
          saving={save.isPending}
          onSave={save.mutate}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" variant="secondary" className="justify-self-start" onClick={() => setEditing({ entry: null })}>
          {c.add}
        </Button>
      )}
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
      {deleting && (
        <Dialog
          compact
          title={c.delete}
          onClose={() => setDeleting(null)}
          actions={
            <>
              <Button variant="ghost" autoFocus onClick={() => setDeleting(null)}>{t.common.cancel}</Button>
              <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(deleting)}>{c.deleteYes}</Button>
            </>
          }
        >
          <p>{c.deleteConfirm.replace('{key}', deleting)}</p>
        </Dialog>
      )}
    </Section>
  );
}

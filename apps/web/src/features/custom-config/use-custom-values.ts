import type { CustomConfigUpsert, CustomConfigView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { customConfigQuery, deleteCustom, putCustom } from './custom-api';

const c = t.config.custom;

/** What «القيم» is doing with a custom value: adding, editing one, or asking before deleting one. */
export type CustomEditing = { mode: 'add' } | { mode: 'edit'; entry: CustomConfigView } | null;
export interface CustomSave {
  key: string;
  body: CustomConfigUpsert;
}

/** Does this save make the value public (a new public value, or a private one turned public)? */
export function turnsPublic(editing: CustomEditing, body: CustomConfigUpsert): boolean {
  if (!body.isPublic || !editing) return false;
  return editing.mode === 'add' || !editing.entry.isPublic;
}

/**
 * «قيم مخصصة» in «القيم»: the add/edit dialog and the delete confirmation (PUT and DELETE
 * /config/custom/:key, each audited), then the list is refetched and `onDone` gets the toast words.
 */
export function useCustomValues(onDone: (message: string) => void) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CustomEditing>(null);
  const [deleting, setDeleting] = useState<CustomConfigView | null>(null);
  const [publicAsk, setPublicAsk] = useState<CustomSave | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: customConfigQuery.queryKey });
  const save = useMutation({
    mutationFn: putCustom,
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      onDone(c.saved);
    },
  });
  const remove = useMutation({
    mutationFn: deleteCustom,
    onSuccess: async () => {
      await refresh();
      setDeleting(null);
      onDone(c.deleted);
    },
  });
  return {
    editing,
    deleting,
    /** A save that would show the value to visitors, waiting for «اجعلها عامة واحفظ». */
    publicAsk,
    submit: (input: CustomSave) => (turnsPublic(editing, input.body) ? setPublicAsk(input) : save.mutate(input)),
    confirmPublic: () => {
      if (publicAsk) save.mutate(publicAsk);
      setPublicAsk(null);
    },
    cancelPublic: () => setPublicAsk(null),
    add: () => {
      save.reset();
      setEditing({ mode: 'add' });
    },
    edit: (entry: CustomConfigView) => {
      save.reset();
      setEditing({ mode: 'edit', entry });
    },
    askDelete: (entry: CustomConfigView) => {
      remove.reset();
      setDeleting(entry);
    },
    closeEdit: () => setEditing(null),
    closeDelete: () => setDeleting(null),
    save,
    remove,
  };
}

export type CustomValues = ReturnType<typeof useCustomValues>;

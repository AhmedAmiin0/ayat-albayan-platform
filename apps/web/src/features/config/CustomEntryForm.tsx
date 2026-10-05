import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { controlClass, Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { parseDraft, type CustomDraft, type CustomDraftErrors } from './custom-form';
import type { CustomConfigUpsert } from '@ab/shared';

const c = t.config.custom;

export interface CustomEntryFormProps {
  initial: CustomDraft;
  /** Editing keeps the key fixed. */
  editing: boolean;
  saving: boolean;
  onSave: (input: { key: string; body: CustomConfigUpsert }) => void;
  onCancel: () => void;
}

function Err({ id, message }: { id: string; message?: string | undefined }) {
  return message ? (
    <p id={id} role="alert" className="text-xs text-danger">
      {message}
    </p>
  ) : null;
}

/** Add or edit one custom entry: key, JSON value, description, public flag; validated before it is sent. */
export function CustomEntryForm({ initial, editing, saving, onSave, onCancel }: CustomEntryFormProps) {
  const id = useId();
  const [draft, setDraft] = useState<CustomDraft>(initial);
  const [errors, setErrors] = useState<CustomDraftErrors>({});
  const set = (patch: Partial<CustomDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = () => {
    const r = parseDraft(draft);
    setErrors(r.ok ? {} : r.errors);
    if (r.ok) onSave({ key: r.key, body: r.body });
  };
  return (
    <div className="grid gap-3 rounded-md border border-rule bg-sunk p-3">
      <div className="grid gap-1">
        <label htmlFor={`${id}-key`} className="text-xs font-semibold">{c.key}</label>
        <Input id={`${id}-key`} dir="ltr" disabled={editing} value={draft.key} aria-invalid={errors.key ? true : undefined} onChange={(e) => set({ key: e.target.value })} />
        <p className="text-2xs text-ink-3">{c.keyHint}</p>
        <Err id={`${id}-key-error`} message={errors.key} />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-value`} className="text-xs font-semibold">{c.value}</label>
        <textarea id={`${id}-value`} dir="ltr" rows={4} value={draft.value} aria-invalid={errors.value ? true : undefined} className={cn(controlClass, 'py-2 font-mono')} onChange={(e) => set({ value: e.target.value })} />
        <Err id={`${id}-value-error`} message={errors.value} />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-desc`} className="text-xs font-semibold">{c.description}</label>
        <Input id={`${id}-desc`} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.isPublic} onChange={(e) => set({ isPublic: e.target.checked })} />
        {c.isPublic}
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>{c.cancel}</Button>
        <Button type="button" disabled={saving} onClick={submit}>{c.save}</Button>
      </div>
    </div>
  );
}

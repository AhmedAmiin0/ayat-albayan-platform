import { DESCRIPTION_MAX, type ConfigEntry } from '@ab/settings';
import { useId, useState, type SubmitEvent } from 'react';
import {
  Button,
  Dialog,
  Field,
  FormAlert,
  controlClass,
  ApiError,
  t,
  locale,
  cn,
} from '@ab/web-kit';
import type { DescribeTarget } from './describe-target';
import { useDescriptionSave } from './use-description-save';

const d = t.settingsValues.describe;

/** 403 `owner_permission`: an owned key's description needs the owning module's right. */
export const ownerRefused = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 403 && (error.body as { code?: unknown } | null)?.code === 'owner_permission';

export interface DescriptionEditorProps {
  target: DescribeTarget;
  entry: ConfigEntry;
  /** The Arabic text the field starts from. */
  start: string;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Arabic description editor, at most 500 characters with a live count; restore once edited. */
export function DescriptionEditor({
  target,
  entry,
  start,
  onClose,
  onDone,
}: DescriptionEditorProps) {
  const formId = useId();
  const [text, setText] = useState(start);
  const [tried, setTried] = useState(false);
  const save = useDescriptionSave(target);
  const empty = text.trim() === '';
  const send = (value: string | null, message: string) =>
    save.mutate(value, {
      onSuccess: () => {
        onDone(message);
        onClose();
      },
    });
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    setTried(true);
    if (empty) return;
    if (text.trim() === start.trim()) {  onClose();; return; }
    send(text.trim(), d.saved);
  };
  const count = d.count.replace('{n}', String(text.length)).replace('{max}', String(DESCRIPTION_MAX));
  return (
    <Dialog
      layout="center"
      title={d.title}
      glyph={{ tone: 'neutral', shape: 'hollow' }}
      description={d.intro.replace('{name}', target.label)}
      onClose={onClose}
      hint={d.note}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending ? t.common.saving : d.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-3" onSubmit={submit} noValidate>
        <Field
          label={d.label}
          hint={count}
          error={tried && empty ? d.required : undefined}
          required
        >
          {(control) => (
            <textarea
              {...control}
              dir="rtl"
              lang="ar"
              rows={4}
              maxLength={DESCRIPTION_MAX}
              value={text}
              disabled={save.isPending}
              onChange={(e) => setText(e.target.value)}
              className={cn(controlClass, 'field-sizing-content min-h-28 py-2 leading-relaxed')}
            />
          )}
        </Field>
        {entry.descriptionEdited && (
          <Button type="button" variant="ghost" size="sm" className="justify-self-start" disabled={save.isPending} onClick={() => send(null, d.restored)}>
            {d.restore}
          </Button>
        )}
        {locale === 'en' && <p className="text-xs text-ink-3">{d.englishNote}</p>}
        {save.isError && (
          <FormAlert>{ownerRefused(save.error) ? d.readOnlyNote : d.error}</FormAlert>
        )}
      </form>
    </Dialog>
  );
}

import { CHANNEL_BODY_MAX } from '@ab/shared';
import { useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Props {
  initial: string;
  pending: boolean;
  onSave: (body: string) => void;
  onCancel: () => void;
}

const a = t.studentChannel.actions;

/** Esc closes the edit box only, never the panel around the chat (its draft stays too). */
function cancelOnEscape(e: KeyboardEvent, onCancel: () => void): void {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  onCancel();
}

/** Same limits as the composer; Esc closes only this box. */
export function ChannelEditForm({ initial, pending, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial);
  const body = text.trim();
  const invalid = !body || body.length > CHANNEL_BODY_MAX || body === initial.trim();
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!invalid && !pending) onSave(body);
  };
  return (
    <form onSubmit={submit} className="grid gap-2">
      <textarea
        aria-label={a.editTitle}
        dir="auto"
        rows={2}
        value={text}
        // The user just asked to edit this text: the cursor goes there.
        ref={(el) => el?.focus()}
        onKeyDown={(e) => cancelOnEscape(e, onCancel)}
        onChange={(e) => setText(e.target.value)}
        className="min-h-11 w-full resize-y rounded-md border border-input bg-raised px-3 py-2 text-body"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="sm" disabled={invalid || pending}>
          {pending ? a.saving : a.save}
        </Button>
      </div>
    </form>
  );
}

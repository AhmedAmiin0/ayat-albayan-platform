import { SAVED_REPLY_BODY_MAX, SAVED_REPLY_TITLE_MAX, type SavedReply, type SavedReplyScope } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { controlClass, Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { createReply, refreshReplies, replyErrorText, updateReply } from '../lib/api';
import { AttachmentField } from './AttachmentField';
import { PlaceholderChips } from './PlaceholderChips';
import { createBody, draftOf, updateBody, type ReplyDraft } from '../lib/reply-draft';

const S = t.savedReplies;

export interface ReplyEditorDialogProps {
  /** null = a new reply in `scope`. */
  reply: SavedReply | null;
  scope: SavedReplyScope;
  onClose: () => void;
}

/**
 * «رد جديد» / «تعديل الرد»: title (≤ 60), the text with its placeholder chips, and an optional image
 * or PDF. Shared by «التواصل» → «الردود السريعة» (the shared list) and the picker's «ردودي».
 */
export function ReplyEditorDialog({ reply, scope, onClose }: ReplyEditorDialogProps) {
  const formId = useId();
  const box = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ReplyDraft>(() => draftOf(reply));
  const [missing, setMissing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const save = useMutation({
    mutationFn: () => (reply ? updateReply({ id: reply.id, body: updateBody(draft, !!reply.attachment) }) : createReply(createBody(draft, scope))),
    onSuccess: async () => {
      await refreshReplies(queryClient);
      onClose();
    },
  });
  const set = (patch: Partial<ReplyDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const blank = !draft.title.trim() || !draft.body.trim();
    setMissing(blank);
    if (!blank && !uploading) save.mutate();
  };
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} disabled={save.isPending || uploading}>
        {t.common.save}
      </Button>
    </>
  );
  return (
    <Dialog title={reply ? S.editTitle : S.addTitle} onClose={onClose} actions={actions}>
      <form id={formId} onSubmit={submit} noValidate className="grid gap-4">
        <Field label={S.fieldTitle} required error={missing && !draft.title.trim() ? t.common.required : undefined}>
          {(p) => <Input {...p} value={draft.title} maxLength={SAVED_REPLY_TITLE_MAX} autoComplete="off" dir="auto" onChange={(e) => set({ title: e.target.value })} />}
        </Field>
        <Field label={S.fieldBody} required error={missing && !draft.body.trim() ? t.common.required : undefined}>
          {(p) => (
            <textarea
              {...p}
              ref={box}
              rows={5}
              dir="auto"
              value={draft.body}
              maxLength={SAVED_REPLY_BODY_MAX}
              onChange={(e) => set({ body: e.target.value })}
              className={cn(controlClass, 'min-h-28 resize-y py-2 leading-normal')}
            />
          )}
        </Field>
        <PlaceholderChips target={box} value={draft.body} onChange={(body) => set({ body })} />
        <AttachmentField file={draft.file} onChange={(file) => set({ file })} onBusy={setUploading} />
        {save.isError && <FormAlert>{replyErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

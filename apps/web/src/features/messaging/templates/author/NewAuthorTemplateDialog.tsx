import type { AuthorTemplate } from '@ab/client-core';
import { templateAuthorSchema } from '@ab/shared';
import { useId, useState, type SubmitEvent } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { editErrorText } from '@/features/messaging/templates/edit/edit-api';
import { previewBlock } from '@/features/messaging/templates/preview/edit-preview';
import { SaveActions } from '@/features/messaging/templates/create/SaveActions';
import { TemplatePreview } from '@/features/messaging/templates/preview/TemplatePreview';
import { WordsFields } from '@/features/messaging/templates/edit/WordsFields';
import { t } from '@/lib/i18n/i18n';
import { emptyAuthorDraft, toAuthorInput, type AuthorDraft } from './author-draft';
import { AuthorFields } from './AuthorFields';
import { useCreateAuthored } from './use-author-templates';

const S = t.templates.author;

/** Plain quick replies, the chat number. */
const WORDS_MODE = { bound: false, repliesOnly: true, line: 'chat' } as const;

export interface NewAuthorTemplateDialogProps {
  onCreated: (tpl: AuthorTemplate) => void;
  onClose: () => void;
}

/**
 * «قالب جديد» for sales (owner 2026-11-14): checked with the API's schema first, then straight to
 * Meta on the chat number; it joins the send list once approved.
 */
export function NewAuthorTemplateDialog({ onCreated, onClose }: NewAuthorTemplateDialogProps) {
  const formId = useId();
  const [draft, setDraft] = useState<AuthorDraft>(emptyAuthorDraft);
  const [refused, setRefused] = useState<ReadonlySet<string>>(() => new Set());
  const create = useCreateAuthored(onCreated);
  const set = (patch: Partial<AuthorDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = templateAuthorSchema.safeParse(toAuthorInput(draft));
    setRefused(new Set(parsed.success ? [] : parsed.error.issues.map((i) => String(i.path[0]))));
    if (parsed.success) create.mutate(parsed.data);
  };
  const error = (f: string) => (refused.has(f) ? t.templates.create.invalidField : undefined);
  const busy = create.isPending;
  const actions = <SaveActions formId={formId} busy={busy} label={S.submit} onClose={onClose} />;
  return (
    <Dialog title={S.newTitle} description={S.newDescription} onClose={onClose} actions={actions}>
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <AuthorFields draft={draft} set={set} error={error} />
        <WordsFields words={draft} set={set} error={error} mode={WORDS_MODE} />
        <TemplatePreview body={draft.body} block={previewBlock(null, draft)} />
        {create.isError && <FormAlert>{editErrorText(create.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

import type { AuthorTemplate } from '@ab/client-core';
import { templateEditSchema, type TemplateEditInput } from '@ab/shared';
import { useState, type SubmitEvent } from 'react';
import { varsOf } from '@/features/messaging/templates/create/template-draft';
import { t } from '@/lib/i18n/i18n';
import { draftOf, toEditInput, type EditDraft } from './edit-draft';
import { previewBlock } from '@/features/messaging/templates/preview/edit-preview';
import { TemplatePreview } from '@/features/messaging/templates/preview/TemplatePreview';
import { WordsFields } from './WordsFields';

export interface TemplateEditFormProps {
  formId: string;
  tpl: AuthorTemplate;
  /** Variables and buttons fixed (code-bound): a different variable count is refused here first. */
  bound: boolean;
  /** An author's template: plain quick replies only. */
  repliesOnly: boolean;
  onSave: (input: TemplateEditInput) => void;
}

/** Which fields the last save refused (by top-level name), and the parsed body when none. */
function check(draft: EditDraft, opts: { bound: boolean; tpl: AuthorTemplate }) {
  const parsed = templateEditSchema.safeParse(toEditInput(draft));
  const varsMoved = opts.bound && varsOf(draft).length !== opts.tpl.params.length;
  const refused = parsed.success ? [] : parsed.error.issues.map((i) => String(i.path[0]));
  return { refused: new Set(varsMoved ? [...refused, 'params'] : refused), parsed, varsMoved };
}

/** «تعديل»: the words, the variables' samples and the buttons, with WhatsApp's preview. */
export function TemplateEditForm(props: TemplateEditFormProps) {
  const { formId, tpl, bound, repliesOnly, onSave } = props;
  const [draft, setDraft] = useState<EditDraft>(() => draftOf(tpl));
  const [refused, setRefused] = useState<ReadonlySet<string>>(() => new Set());
  const [varsMoved, setVarsMoved] = useState(false);
  const set = (patch: Partial<EditDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const out = check(draft, { bound, tpl });
    setRefused(out.refused);
    setVarsMoved(out.varsMoved);
    if (out.parsed.success && !out.varsMoved) onSave(out.parsed.data);
  };
  const error = (f: string) => (refused.has(f) ? t.templates.create.invalidField : undefined);
  const varError = (f: string) =>
    (varsMoved && f === 'params' ? t.templates.error.code_bound_variables : error(f));
  return (
    <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
      <WordsFields
        words={draft}
        set={set}
        error={varError}
        mode={{ bound, repliesOnly, line: tpl.line }}
      />
      <TemplatePreview body={draft.body} block={previewBlock(tpl.display?.header ?? null, draft)} />
    </form>
  );
}

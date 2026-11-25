import { templateCreateSchema, type TemplateView } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import { useId, useState, type SubmitEvent } from 'react';
import { FormAlert, Dialog, t } from '@ab/web-kit';
import { templateErrorText } from '@/features/messaging/templates/api';
import { ButtonFields } from './ButtonFields';
import { SaveActions } from './SaveActions';
import { emptyDraft, toInput, type TemplateDraft } from './template-draft';
import { ContentFields, IdentityFields } from './TemplateTextFields';
import { useCreateTemplate } from './use-create-template';
import { VariableFields } from './VariableFields';

const S = t.templates.create;

interface CreateTemplateDialogProps {
  /** The number the form starts on. */
  line: WaLine;
  /** A number on the crm driver (docs/19): the template is saved here and created in the CRM. */
  onCrm: (line: WaLine) => boolean;
  onCreated: (tpl: TemplateView) => void;
  onClose: () => void;
}

/** Saving never reaches Meta; the caller then offers the submit dialog for that row. */
export function CreateTemplateDialog(props: CreateTemplateDialogProps) {
  const { line, onCrm, onCreated, onClose } = props;
  const formId = useId();
  const [draft, setDraft] = useState<TemplateDraft>(() => emptyDraft(line));
  const [refused, setRefused] = useState<ReadonlySet<string>>(() => new Set());
  const create = useCreateTemplate(onCreated);
  const set = (patch: Partial<TemplateDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const parsed = templateCreateSchema.safeParse(toInput(draft));
    setRefused(new Set(parsed.success ? [] : parsed.error.issues.map((i) => String(i.path[0]))));
    if (parsed.success) create.mutate(parsed.data);
  };
  const error = (f: string) => (refused.has(f) ? S.invalidField : undefined);
  const fields = { draft, set, error };
  const actions = (
    <SaveActions formId={formId} busy={create.isPending} label={S.save} onClose={onClose} />
  );
  return (
    <Dialog title={S.title} description={S.description} onClose={onClose} actions={actions} wide>
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <IdentityFields {...fields} />
        {onCrm(draft.line) && (
          <p role="note" className="border-s border-s-rule ps-3 text-sm text-ink-2">
            {S.crmNote}
          </p>
        )}
        <ContentFields {...fields} />
        <VariableFields {...fields} />
        <ButtonFields {...fields} />
        {create.isError && <FormAlert>{templateErrorText(create.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

import { templateCreateSchema, type TemplateView, type WaLine } from '@ab/shared';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { templateErrorText } from '@/features/messaging/templates/api';
import { t } from '@/lib/i18n/i18n';
import { ButtonFields } from './ButtonFields';
import { emptyDraft, toInput, type TemplateDraft } from './template-draft';
import { ContentFields, IdentityFields } from './TemplateTextFields';
import { useCreateTemplate } from './use-create-template';
import { VariableFields } from './VariableFields';

const S = t.templates.create;

/** «إلغاء» and «حفظ القالب» (the form's submit, outside it in the dialog's footer). */
interface SaveActionsProps {
  formId: string;
  busy: boolean;
  onClose: () => void;
}

function SaveActions({ formId, busy, onClose }: SaveActionsProps) {
  return (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} disabled={busy}>
        {busy ? t.common.saving : S.save}
      </Button>
    </>
  );
}

interface CreateTemplateDialogProps {
  /** The number the form starts on. */
  line: WaLine;
  /** A number on the crm driver (docs/19): the template is saved here and created in the CRM. */
  onCrm: (line: WaLine) => boolean;
  onCreated: (tpl: TemplateView) => void;
  onClose: () => void;
}

/**
 * «قالب جديد» (owner 2026-10-31): a new registry row, checked with the API's own schema before it
 * leaves (a refused field is marked, nothing is sent). Saving never reaches Meta: the caller then
 * offers the existing «إرسال إلى ميتا» dialog for that row (a crm number: the CRM steps instead).
 */
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
  const actions = <SaveActions formId={formId} busy={create.isPending} onClose={onClose} />;
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

import type { AuthorTemplate } from '@ab/client-core';
import { useId, useState } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { SaveActions } from '@/features/messaging/templates/create/SaveActions';
import { t } from '@/lib/i18n/i18n';
import { editErrorText, type EditMode } from './edit-api';
import { canSave, editState } from './edit-state';
import { EditNotes } from './EditNotes';
import { TemplateEditForm } from './TemplateEditForm';
import { useEditTemplate } from './use-edit-template';

const S = t.templates.edit;

export interface EditTemplateDialogProps {
  tpl: AuthorTemplate;
  mode: EditMode;
  onSaved: (tpl: AuthorTemplate) => void;
  onClose: () => void;
}

/**
 * «تعديل» (owner 2026-11-14): Meta's rules on top, the form, and one save that is disabled while
 * Meta would refuse (under review, or the approved template's next edit not open yet).
 */
export function EditTemplateDialog({ tpl, mode, onSaved, onClose }: EditTemplateDialogProps) {
  const formId = useId();
  // Meta's limits read once, when the dialog opens.
  const [now] = useState(() => new Date());
  const state = editState(tpl, now);
  const save = useEditTemplate(onSaved);
  const busy = save.isPending;
  const actions = (
    <SaveActions
      formId={formId}
      busy={busy}
      label={S.save}
      disabled={!canSave(state)}
      onClose={onClose}
    />
  );
  return (
    <Dialog title={`${S.title} «${tpl.key}»`} onClose={onClose} actions={actions} wide>
      <div className="grid gap-5">
        <EditNotes state={state} />
        <TemplateEditForm
          formId={formId}
          tpl={tpl}
          bound={state.bound}
          repliesOnly={mode === 'author'}
          onSave={(input) => save.mutate({ mode, key: tpl.key, input })}
        />
        {save.isError && <FormAlert>{editErrorText(save.error)}</FormAlert>}
      </div>
    </Dialog>
  );
}

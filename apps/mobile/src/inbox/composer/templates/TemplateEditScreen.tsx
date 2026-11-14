import type { AuthorTemplate, TemplateListMode } from '@ab/client-core';
import { bodyVarCount } from '@ab/client-core';
import { editRoute, isCodeBound } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import {
  BodyFields, ButtonsField, DraftPreview, draftOf, editPayload, EditRules, useTemplateDraft,
} from '@/inbox/composer/templates/form';
import {
  templateApi, templateErrorText, useTemplateList, useTemplateMode, useTemplateSave,
} from './templates-api';

/** The admin edits through /:key/content, an author through /authored/:key. */
const SEND = { admin: templateApi.editContent, author: templateApi.editAuthored } as const;

interface EditFormProps {
  template: AuthorTemplate;
  mode: TemplateListMode;
}

/** A code-bound template keeps its number of variables: the words around them change only. */
const varsKept = (template: AuthorTemplate, body: string): boolean =>
  !isCodeBound(template.key) || bodyVarCount(body) === template.params.length;

function EditForm({ template, mode }: EditFormProps) {
  const { draft, set } = useTemplateDraft(draftOf(template));
  const [invalid, setInvalid] = useState(false);
  const save = useTemplateSave(SEND[mode]);
  const bound = isCodeBound(template.key);
  const open = editRoute(template.status) !== null;
  const kept = varsKept(template, draft.body);
  const submit = () => {
    const parsed = editPayload(draft, template.params);
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    save.mutate({ key: template.key, input: parsed.data }, { onSuccess: () => router.back() });
  };
  return (
    <>
      <EditRules status={template.status} edits={template.approved_edits ?? []} codeBound={bound} />
      {open ? null : <Note alert>{t.templates.edit.pendingNote}</Note>}
      <BodyFields draft={draft} set={set} />
      <ButtonsField buttons={draft.buttons} set={set} reshape={!bound} />
      <DraftPreview draft={draft} source={template} />
      {kept ? null : <ErrorLine message={t.templates.error.code_bound_variables} />}
      {invalid ? <ErrorLine message={t.templates.create.invalidField} /> : null}
      {save.isError ? <ErrorLine message={templateErrorText(save.error)} /> : null}
      <Button
        label={save.isPending ? t.common.saving : t.templates.edit.save}
        busy={save.isPending}
        disabled={!open || !kept}
        onPress={submit}
      />
    </>
  );
}

/** «تعديل» (owner 2026-11-14): one template of the list, by its key (the route's param). */
export function TemplateEditScreen({ templateKey }: { templateKey: string }) {
  const mode = useTemplateMode();
  const list = useTemplateList(mode);
  const template = list.data?.find((tpl) => tpl.key === templateKey) ?? null;
  return (
    <Screen scroll>
      <ScreenHeader title={t.templates.edit.title} subtitle={template?.meta_name} />
      {list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : null}
      {template ? <EditForm key={template.key} template={template} mode={mode} /> : null}
    </Screen>
  );
}

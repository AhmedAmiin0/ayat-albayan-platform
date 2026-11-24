import {
  AUTHOR_DAILY_LIMIT, suggestedCategory, TEMPLATE_KEY_PATTERN, type AuthorCategory,
} from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { t, Field, Screen, ScreenHeader, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import {
  authorPayload, BodyFields, ButtonsField, CategoryPicker, DraftPreview, EMPTY_DRAFT,
  useTemplateDraft,
} from '@/inbox/composer/templates/form';
import { templateApi, templateErrorText, useTemplateSave } from './templates-api';

const dailyLimit = () => t.templates.author.dailyLimit.replace('{max}', String(AUTHOR_DAILY_LIMIT));

/** Sent straight to Meta; the category follows the text until the author picks one. */
export function TemplateCreateScreen() {
  const { draft, set } = useTemplateDraft(EMPTY_DRAFT);
  const [key, setKey] = useState('');
  const [picked, setPicked] = useState<AuthorCategory | null>(null);
  const [invalid, setInvalid] = useState(false);
  const save = useTemplateSave(templateApi.createAuthored);
  const category = picked ?? suggestedCategory(draft.body);
  const submit = () => {
    const parsed = authorPayload(draft, { key, category });
    setInvalid(!parsed.success);
    if (parsed.success) save.mutate(parsed.data, { onSuccess: () => router.back() });
  };
  const keyBad = key.trim() !== '' && !TEMPLATE_KEY_PATTERN.test(key.trim());
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.templates.author.newTitle}
        subtitle={t.templates.author.newDescription}
      />
      <Field
        label={t.templates.author.key}
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        ltr
      />
      <Note alert={keyBad}>{t.templates.author.keyHint}</Note>
      <BodyFields draft={draft} set={set} />
      <CategoryPicker value={category} onChange={setPicked} />
      <ButtonsField buttons={draft.buttons} set={set} reshape />
      <DraftPreview draft={draft} source={null} />
      <Note>{dailyLimit()}</Note>
      {invalid ? <ErrorLine message={t.templates.create.invalidField} /> : null}
      {save.isError ? <ErrorLine message={templateErrorText(save.error)} /> : null}
      <Button
        label={save.isPending ? t.common.saving : t.templates.author.submit}
        busy={save.isPending}
        disabled={draft.body.trim() === '' || keyBad}
        onPress={submit}
      />
    </Screen>
  );
}

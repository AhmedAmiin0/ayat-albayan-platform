import { LOCALES, placeholderTokens, type Locale, type TranslationKeyRow } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { LocaleTextField } from './LocaleTextField';
import { editedOnValues, registryHintOf } from './registry-hints';
import { changesFor, defaultOf, draftProblems, draftsOf, overrideOf, type Drafts } from './translation-edit';
import { useOverrideChange } from './translations.api';

export interface TranslationEditorProps {
  row: TranslationKeyRow;
  onClose: () => void;
  /** After a save or restore: the page's confirmation line. */
  onDone: (message: string) => void;
}

/** 409 `edit_on_values`: an ar override on a registry hint key (it is a description, edited on «القيم»). */
export function isEditOnValues(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error) || error.status !== 409 || !('body' in error)) return false;
  const { body } = error;
  return typeof body === 'object' && body !== null && 'code' in body && body.code === 'edit_on_values';
}

/** The aside panel of «الترجمات»: both languages side by side, the slots to keep, save / restore. */
export function TranslationEditor({ row, onClose, onDone }: TranslationEditorProps) {
  const formId = useId();
  const [drafts, setDrafts] = useState<Drafts>(() => draftsOf(row));
  const change = useOverrideChange();
  const problems = draftProblems(row, drafts);
  const tokens = placeholderTokens(row.ar);
  const done = (message: string) => () => {
    onDone(message);
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const changes = changesFor(row, drafts);
    if (Object.keys(problems).length > 0) return;
    if (changes.length === 0) return onClose();
    change.mutate(changes, { onSuccess: done(t.translations.saved) });
  };
  const restore = (locale: Locale) => () =>
    change.mutate([{ locale, key: row.key, value: null }], { onSuccess: done(t.translations.restored) });
  return (
    <Dialog
      wide
      title={t.translations.editKey.replace('{key}', row.key)}
      onClose={onClose}
      hint={t.translations.applyNote}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={change.isPending}>
            {change.isPending ? t.common.saving : t.translations.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        {tokens.length > 0 && (
          <p className="text-sm text-ink-2">{t.translations.placeholderHint.replace('{tokens}', tokens.join(' '))}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {LOCALES.map((locale) => (
            <LocaleTextField
              key={locale}
              locale={locale}
              value={drafts[locale]}
              onChange={(value) => setDrafts((d) => ({ ...d, [locale]: value }))}
              original={defaultOf(row, locale)}
              missing={problems[locale]}
              onRestore={overrideOf(row, locale) !== null ? restore(locale) : undefined}
              disabled={change.isPending}
              onValues={editedOnValues(row.key, locale) ? registryHintOf(row.key) : undefined}
            />
          ))}
        </div>
        {change.isError && <FormAlert>{isEditOnValues(change.error) ? t.translations.arabicOnValues : t.common.error}</FormAlert>}
      </form>
    </Dialog>
  );
}

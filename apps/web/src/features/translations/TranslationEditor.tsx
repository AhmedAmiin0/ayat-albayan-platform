import { LOCALES, placeholderTokens, type Locale, type TranslationKeyRow } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { LocaleTextField } from './LocaleTextField';
import { changesFor, defaultOf, draftProblems, draftsOf, overrideOf, type Drafts } from './translation-edit';
import { useOverrideChange } from './translations.api';

export interface TranslationEditorProps {
  row: TranslationKeyRow;
  onClose: () => void;
  /** After a save or restore: the page's confirmation line. */
  onDone: (message: string) => void;
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
            />
          ))}
        </div>
        {change.isError && <FormAlert>{t.common.error}</FormAlert>}
      </form>
    </Dialog>
  );
}

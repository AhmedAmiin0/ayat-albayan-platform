import { MAX_TRANSLATION_LENGTH, type Locale } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { controlClass } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RegistryHint } from './registry-hints';
import { ValuesLink } from './ValuesLink';

export interface LocaleTextFieldProps {
  locale: Locale;
  value: string;
  onChange: (value: string) => void;
  /** The bundled text, shown under the field. */
  original: string;
  /** Slots the draft dropped (blocks «حفظ»). */
  missing?: string[] | undefined;
  /** Shown when the key has an override in this locale. */
  onRestore?: (() => void) | undefined;
  disabled?: boolean;
  /** The Arabic of a registry hint key: read-only here, with the link to «القيم». */
  onValues?: RegistryHint | undefined;
}

/** One language of the editor: the text, its original, and «استعادة الأصل» when overridden. */
export function LocaleTextField(p: LocaleTextFieldProps) {
  const label = p.locale === 'ar' ? t.translations.arabic : t.translations.english;
  const locked = p.onValues !== undefined;
  const error = p.missing?.length ? t.translations.placeholdersMissing.replace('{tokens}', p.missing.join(' ')) : undefined;
  return (
    <div className="grid content-start gap-2">
      <Field label={label} error={error} hint={locked ? t.translations.arabicOnValues : t.translations.original.replace('{text}', p.original)}>
        {(control) => (
          <textarea
            {...control}
            dir={p.locale === 'ar' ? 'rtl' : 'ltr'}
            lang={p.locale}
            rows={3}
            maxLength={MAX_TRANSLATION_LENGTH}
            value={p.value}
            disabled={p.disabled}
            readOnly={locked}
            onChange={(e) => p.onChange(e.target.value)}
            className={cn(controlClass, 'field-sizing-content min-h-24 py-2 leading-relaxed sm:min-h-24')}
          />
        )}
      </Field>
      {p.onValues && <ValuesLink hint={p.onValues} />}
      {p.onRestore && !locked && (
        <Button type="button" variant="ghost" size="sm" className="justify-self-start" disabled={p.disabled} onClick={p.onRestore}>
          {t.translations.restore}
        </Button>
      )}
    </div>
  );
}

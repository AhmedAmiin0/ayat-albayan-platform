import type { Locale, TranslationKeyRow } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import { effectiveText, overrideOf } from './translation-edit';

const col = createColumnHelper<DataTableFeatures, TranslationKeyRow>();

function TextCell({ row, locale }: { row: TranslationKeyRow; locale: Locale }) {
  return (
    <span dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale} className="block whitespace-normal">
      {effectiveText(row, locale)}
      {overrideOf(row, locale) !== null && (
        <span className="ms-2 inline-block rounded-sm bg-act/10 px-1.5 text-2xs font-semibold text-act">
          {t.translations.overridden}
        </span>
      )}
    </span>
  );
}

/** «الترجمات»: key | العربية | English, each with the text the UI shows today. */
export const translationColumns = col.columns([
  col.accessor('key', {
    header: () => t.translations.key,
    cell: (c) => (
      <code dir="ltr" className="text-xs text-ink-2">
        {c.getValue()}
      </code>
    ),
  }),
  col.display({
    id: 'ar',
    header: () => t.translations.arabic,
    cell: (c) => <TextCell row={c.row.original} locale="ar" />,
  }),
  col.display({
    id: 'en',
    header: () => t.translations.english,
    cell: (c) => <TextCell row={c.row.original} locale="en" />,
  }),
]);

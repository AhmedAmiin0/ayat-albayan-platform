import { useRouter } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { isPlainClick } from '@/features/reports/ReportLink';
import { t } from '@/lib/i18n';
import type { RegistryHint } from './registry-hints';
import { valuesHref } from './registry-hints';

/**
 * «عدّله من «القيم»»: a real <a href> (it carries the query string without a typed route search) that
 * navigates in-app on a plain click; its click never opens the row's editor.
 */
export function ValuesLink({ hint }: { hint: RegistryHint }) {
  const router = useRouter({ warn: false });
  const href = valuesHref(hint);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    if (!router || !isPlainClick(e)) return;
    e.preventDefault();
    void router.navigate({ href });
  };
  return (
    <a
      href={href}
      onClick={onClick}
      className="inline-flex min-h-11 items-center text-xs font-semibold text-lapis underline underline-offset-4 sm:min-h-6"
    >
      {t.translations.editOnValues}
    </a>
  );
}

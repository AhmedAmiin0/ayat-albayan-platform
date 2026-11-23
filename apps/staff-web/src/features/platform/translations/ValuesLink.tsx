import { useRouter } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { isPlainClick } from '@/features/reporting/reports/history/ReportLink';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { RegistryHint } from './registry-hints';
import { valuesHref } from './registry-hints';

/** A real anchor carries the query string without a typed route search; never opens the editor. */
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

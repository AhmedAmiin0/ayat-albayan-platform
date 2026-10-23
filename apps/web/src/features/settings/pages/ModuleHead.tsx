import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { t } from '@/lib/i18n';

/**
 * The head of a module page under /admin/settings (docs/26b §3): the way back «الإعدادات › …»,
 * then the page's one title (the cartouche) and, beside it, what the page wants seen from every tab.
 */
export function ModuleHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <nav aria-label={t.settingsPages.crumbs} className="mb-2 flex flex-wrap items-center gap-1 text-xs">
        <Link
          to="/admin/settings"
          className="inline-flex min-h-11 items-center font-semibold text-lapis underline-offset-4 hover:underline sm:min-h-0"
        >
          {t.settings.title}
        </Link>
        <Icon name="chevron-left" className="size-3.5 text-ink-3" />
        <span aria-current="page" className="text-ink-2">
          {title}
        </span>
      </nav>
      <PageHead>
        <Cartouche>{title}</Cartouche>
        {children}
      </PageHead>
    </>
  );
}

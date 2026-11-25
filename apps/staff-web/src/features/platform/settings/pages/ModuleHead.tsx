import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Cartouche, Icon, PageHead, t } from '@ab/web-kit';

/** docs/26b §3. */
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

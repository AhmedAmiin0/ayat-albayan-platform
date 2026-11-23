import { LEGAL_PAGES, LEGAL_PATHS } from '@ab/client-core';
import { Link } from '@tanstack/react-router';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export function LegalLinks() {
  return (
    <nav
      aria-label={t.legal.links.nav}
      className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm"
    >
      {LEGAL_PAGES.map((page) => (
        <Link
          key={page}
          to={LEGAL_PATHS[page]}
          className="text-ink-2 underline-offset-4 hover:text-ink hover:underline"
        >
          {t.legal.links[page]}
        </Link>
      ))}
    </nav>
  );
}

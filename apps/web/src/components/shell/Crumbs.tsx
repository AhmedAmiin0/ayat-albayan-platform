import { Link, useRouterState } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { crumbsFor } from './crumb-trail';

/** Breadcrumbs for the running head. The current page is the last, unlinked crumb. */
export function Crumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = crumbsFor(pathname);
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label={t.common.breadcrumbs}>
      <ol className="flex items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {i > 0 && <Icon name="chevron-left" className="size-3.5" />}
            {c.to ? (
              <Link to={c.to} className="text-ink-3 hover:text-ink-2">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink-2">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

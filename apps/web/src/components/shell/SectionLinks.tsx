import type { Permission } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface SectionLink {
  to: string;
  label: string;
  icon: IconName;
  /** Active only on this exact path (a section home such as /teacher). */
  exact?: boolean;
  /** Dynamic roles: the permission that opens the page. */
  permission: Permission;
  /** A count after the label, part of the link's name (like AdminNav's): «3 غير مقروءة». */
  count?: string | undefined;
}

export interface SectionLinksProps {
  label: string;
  items: readonly SectionLink[];
  /** Shows only the items whose permission the user holds (default: all). */
  can?: (permission: Permission) => boolean;
}

/**
 * A role's own pages (teacher, sales) as ONE list: a vertical list of 44px rows in the «القائمة»
 * sheet (< 900px), a row of links under the logo from 900px (docs/07 §7).
 */
export function SectionLinks({ label, items, can = () => true }: SectionLinksProps) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-0.5 shell:flex-row shell:flex-wrap shell:gap-1">
        {items.filter((item) => can(item.permission)).map((item) => (
          <li key={item.to} className="min-w-0">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                'group flex min-h-11 items-center gap-2.5 rounded-md border-s-[3px] border-transparent px-2.5 font-medium whitespace-nowrap text-ink-2 hover:bg-sunk hover:text-ink',
                'aria-[current=page]:border-lapis aria-[current=page]:bg-sunk aria-[current=page]:font-semibold aria-[current=page]:text-ink',
                'shell:min-h-12 shell:gap-2 shell:border-0 shell:px-3 shell:aria-[current=page]:bg-page shell:aria-[current=page]:shadow-[0_0_0_1px_var(--rule-strong)]',
              )}
            >
              <Icon name={item.icon} className="text-ink-3 group-aria-[current=page]:text-lapis" />
              <span>{item.label}</span>
              {item.count && (
                <>
                  {' '}
                  <span className="ms-auto text-2xs font-bold text-act tabular-nums shell:ms-0">{item.count}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import type { Permission } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MONEY_GROUP, visibleGroups, type NavKey } from './admin-nav-items';

export { visibleGroups, type NavKey } from './admin-nav-items';

// One vertical list: in the «القائمة» sheet (< 900px) on the card, ≥ 900px the fihris on the mint
// (dark: green-grey) sidebar in cover ink. The current item is a tile (sunk in the sheet, white on
// the sidebar) with a 4px emerald bar inset at the inline-start (right in RTL, left in LTR).
// Spacing is a 4px grid: 12px to the icon, 8px icon → label, 40px tall (44 in the sheet and on touch).
const LINK = cn(
  'group relative flex min-h-11 min-w-0 items-center gap-2 whitespace-nowrap rounded-md px-3 font-medium text-ink-2 transition-colors duration-150 ease-out',
  'before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-transparent before:transition-colors before:duration-150',
  'hover:bg-sunk hover:text-ink shell:min-h-10 shell:pointer-coarse:min-h-11 shell:text-cover-ink shell:hover:bg-leather-deep shell:hover:text-cover-ink',
  'aria-[current=page]:bg-sunk aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:before:bg-lapis shell:aria-[current=page]:bg-page',
);

/** A real count from the API. `act` = work waiting for the admin (saffron, says what it is). */
export type NavCount = { text: string; act?: boolean };

export interface AdminNavProps {
  /** Counts only where real data exists; a missing key renders no count. */
  counts?: Partial<Record<NavKey, NavCount>>;
  /** Dynamic roles: an item shows only when the user holds its permission (default: all shown). */
  can?: (permission: Permission) => boolean;
}

/** The admin nav: section lists with dot leaders + counts (sidebar) or end-aligned counts (sheet). */
export function AdminNav({ counts = {}, can = () => true }: AdminNavProps) {
  return (
    <nav aria-label={t.nav.label} className="flex flex-col gap-3 shell:gap-4">
      {visibleGroups(can).map((group) => (
        <ul
          key={group[0]?.key}
          aria-label={group[0]?.key === MONEY_GROUP ? t.finance.nav : undefined}
          className="flex flex-col gap-1 border-t border-rule pt-3 first:border-0 first:pt-0 shell:border-0 shell:pt-0"
        >
          {group[0]?.key === MONEY_GROUP && (
            <li aria-hidden="true" className="px-3 pb-1 text-2xs font-semibold text-ink-3 shell:text-cover-ink shell:opacity-70">
              {t.finance.nav}
            </li>
          )}
          {group.map((item) => {
            const count = counts[item.key];
            return (
              <li key={item.key}>
                <Link to={item.to} className={LINK}>
                  <Icon name={item.icon} className="text-ink-3 shell:text-cover-ink group-aria-[current=page]:text-lapis" />
                  <span className="shell:min-w-0 shell:whitespace-normal shell:py-1 shell:leading-snug">{item.label}</span>
                  {count && (
                    <>
                      {' '}
                      <i aria-hidden="true" className="mt-1.5 hidden h-px min-w-1.5 flex-1 border-t-[1.5px] border-dotted border-rule-strong shell:block" />
                      <span
                        className={cn(
                          'ms-auto text-2xs tabular-nums shell:ms-0',
                          count.act ? 'font-bold text-act' : 'font-medium text-ink-3',
                        )}
                      >
                        {count.text}
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );
}

import { familyTabs, type FamilyTab } from '@ab/client-core';
import { Link, useLocation } from '@tanstack/react-router';
import { Icon, t, followSelected, cn } from '@ab/web-kit';
import { TAB_ICON, TAB_PATH, tabOf } from '@/features/shell/tab-links';
import { useFamilyPick } from '@/features/shell/use-family-pick';

// The staff fihris idiom (apps/staff-web AdminNav): on the rail an item is a 44px row, the current
// one a page-white tile with a 4px lapis bar at the inline-start; on a phone's bottom bar the
// current one sits on the green wash. The tile is ONE element that slides to the chosen tab
// (motion.css `.ab-indicator`, --duration-move): it says where the page went.
const ITEM = cn(
  'group ab-press relative z-10 flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5',
  'rounded-md px-1 text-2xs font-medium text-ink-2 transition-[color,transform]',
  'duration-(--duration-press) ease-ink',
  'hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink',
  'shell:min-h-11 shell:flex-row shell:justify-start shell:gap-2.5 shell:px-3',
  'shell:text-sm shell:text-cover-ink',
);

const INDICATOR = cn(
  'ab-indicator pointer-events-none absolute top-0 left-0 rounded-md bg-accent',
  'shell:bg-page shell:shadow-page before:absolute before:inset-y-2.5 before:start-0',
  'before:hidden before:w-1 before:rounded-full before:bg-lapis shell:before:block',
);

function TabLink({ tab, current }: { tab: FamilyTab; current: boolean }) {
  return (
    <Link
      to={TAB_PATH[tab]}
      ref={current ? followSelected : undefined}
      aria-current={current ? 'page' : undefined}
      activeProps={{}}
      className={ITEM}
    >
      <Icon name={TAB_ICON[tab]} className="size-5 group-aria-[current=page]:text-lapis" />
      <span>{t.portal.app.tabs[tab]}</span>
    </Link>
  );
}

/** The reports tab waits for the student; its slot is kept while loading so the bar never jumps. */
export function TabBar() {
  const pick = useFamilyPick();
  const tabs = familyTabs(pick);
  const current = tabOf(useLocation().pathname);
  return (
    <nav aria-label={t.familyWeb.nav} className="shell:contents">
      <ul data-indicator-host className="relative flex gap-1 shell:flex-col">
        {current && <span data-indicator hidden aria-hidden="true" className={INDICATOR} />}
        {tabs.map((tab) => (
          <li key={tab} className="flex flex-1 shell:flex-none">
            <TabLink tab={tab} current={tab === current} />
          </li>
        ))}
        {pick.state === 'loading' && <li aria-hidden="true" className="flex-1 shell:hidden" />}
      </ul>
    </nav>
  );
}

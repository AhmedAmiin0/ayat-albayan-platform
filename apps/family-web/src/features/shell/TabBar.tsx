import { familyTabs, type FamilyTab } from '@ab/client-core';
import { Link, useRouterState } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { litFrom, TAB_ICON, TAB_PATH } from './tab-links';
import { useFamilyPick } from './use-family-pick';

/** Where the bar sits: the bottom bar on phones, the pill row in the dark header when wide. */
type TabPlace = 'bottom' | 'top';

interface PlaceLook {
  nav: string;
  li: string;
  item: string;
  icon: string;
}

const BOTTOM: PlaceLook = {
  nav: 'fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-[var(--fam-bar)] px-2.5 pt-2 ' +
    'pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-[0_-6px_18px_rgba(12,42,30,0.06)] ' +
    'backdrop-blur shell:hidden',
  li: 'flex flex-1',
  item: 'group flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl ' +
    'border-[1.5px] border-transparent px-1 text-xs font-semibold text-ink-3 transition-colors ' +
    'hover:bg-sunk aria-[current=page]:border-gold aria-[current=page]:bg-gold/15 ' +
    'aria-[current=page]:font-extrabold aria-[current=page]:text-ink',
  icon: 'size-[22px] group-aria-[current=page]:text-lapis',
};

const TOP: PlaceLook = {
  nav: 'hidden shell:block',
  li: 'flex',
  item: 'flex min-h-11 items-center rounded-full border border-transparent px-4 text-[15px] ' +
    'font-semibold whitespace-nowrap text-white/90 transition-colors hover:bg-white/10 ' +
    'aria-[current=page]:border-fam-gold/55 aria-[current=page]:bg-fam-gold/12 ' +
    'aria-[current=page]:font-extrabold aria-[current=page]:text-fam-gold',
  icon: 'hidden',
};

const LOOK: Readonly<Record<TabPlace, PlaceLook>> = { bottom: BOTTOM, top: TOP };

/** One pill; current on its page, and on its pages elsewhere (a report under «التقارير»). */
function TabLink({ tab, look }: { tab: FamilyTab; look: PlaceLook }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <Link to={TAB_PATH[tab]} className={look.item} activeOptions={{ includeSearch: false }}
      aria-current={litFrom(tab, pathname) ? 'page' : undefined}>
      <Icon name={TAB_ICON[tab]} className={look.icon} aria-hidden="true" />
      <span>{t.portal.app.tabs[tab]}</span>
    </Link>
  );
}

/**
 * The family bar (owner 2026-11-16): the student in view's الرئيسية · الجدول · التقارير · حسابي;
 * no «التقارير» until that student is known (a guardian of several picks one first). The bottom
 * bar on phones (`bottom`), gold-outlined pills in the dark header from the `shell:` width (`top`);
 * each hides at the other's width, so one nav landmark shows at a time.
 */
export function TabBar({ place = 'bottom' }: { place?: TabPlace }) {
  const tabs = familyTabs(useFamilyPick());
  const look = LOOK[place];
  return (
    <nav aria-label={t.familyWeb.nav} data-place={place} className={look.nav}>
      <ul className="flex gap-1.5">
        {tabs.map((tab) => (
          <li key={tab} className={look.li}>
            <TabLink tab={tab} look={look} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

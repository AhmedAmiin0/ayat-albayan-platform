import { familyTabs, type FamilyTab } from '@ab/client-core';
import { Link } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { TAB_ICON, TAB_PATH } from './tab-links';
import { useFamilyPick } from './use-family-pick';

const ITEM =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-2xs ' +
  'font-medium text-ink-2 transition-colors hover:bg-sunk aria-[current=page]:text-ink ' +
  'aria-[current=page]:font-semibold shell:min-h-11 shell:flex-none shell:flex-row ' +
  'shell:justify-start shell:gap-2.5 shell:px-3 shell:text-sm aria-[current=page]:bg-accent';

function TabLink({ tab }: { tab: FamilyTab }) {
  return (
    <Link to={TAB_PATH[tab]} className={ITEM} activeOptions={{ includeSearch: false }}>
      <Icon name={TAB_ICON[tab]} className="size-5" aria-hidden="true" />
      <span>{t.portal.app.tabs[tab]}</span>
    </Link>
  );
}

/**
 * The family bar (owner 2026-11-16): the student in view's الرئيسية · الجدول · التقارير · حسابي;
 * no «التقارير» until that student is known (a guardian of several picks one first). A bottom
 * bar on phones, a side rail on wide screens.
 */
export function TabBar() {
  const tabs = familyTabs(useFamilyPick());
  return (
    <nav
      aria-label={t.familyWeb.nav}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-raised/95 px-2
        pb-[env(safe-area-inset-bottom)] backdrop-blur shell:sticky shell:top-0 shell:h-screen
        shell:border-t-0 shell:border-e shell:bg-raised shell:px-3 shell:py-5"
    >
      <ul className="flex gap-1 shell:flex-col">
        {tabs.map((tab) => (
          <li key={tab} className="flex flex-1 shell:flex-none">
            <TabLink tab={tab} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { t } from '@ab/web-kit';
import { INDICATOR } from './tab-bar.helpers';
import { TabLink } from './TabLink';
import { useTabBar } from './use-tab-bar';

/** The reports tab waits for the student; its slot is kept while loading so the bar never jumps. */
export function TabBar() {
  const { tabs, current, loading } = useTabBar();
  return (
    <nav aria-label={t.familyWeb.nav} className="shell:contents">
      <ul data-indicator-host className="relative flex gap-1 shell:flex-col">
        {current && <span data-indicator hidden aria-hidden="true" className={INDICATOR} />}
        {tabs.map((tab) => (
          <li key={tab} className="flex flex-1 shell:flex-none">
            <TabLink tab={tab} current={tab === current} />
          </li>
        ))}
        {loading && <li aria-hidden="true" className="flex-1 shell:hidden" />}
      </ul>
    </nav>
  );
}

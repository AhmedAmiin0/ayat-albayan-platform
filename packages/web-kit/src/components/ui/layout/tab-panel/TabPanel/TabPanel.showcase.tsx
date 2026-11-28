import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Tabs } from '@ab/web-kit/components/ui/layout/tabs';
import { SHOWCASE_FRAMES } from '@ab/web-kit/components/ui/showcase-frames';
import { TabPanel } from './TabPanel';

const STAFF = [
  { value: 'students', label: t.nav.students },
  { value: 'teachers', label: t.nav.teachers },
];
const FAMILY = [
  { value: 'reports', label: t.nav.reports },
  { value: 'subscriptions', label: t.nav.subscriptions },
];
const noop = () => undefined;

/**
 * A staff strip and a family strip, each with its open panel, at 360 px in RTL and LTR, light and
 * dark. The panel has no motion of its own, so reduced motion changes nothing; the tabs are 44 px.
 */
export function TabPanelShowcase() {
  return (
    <div className="grid gap-3 p-4">
      {SHOWCASE_FRAMES.map((c) => (
        <section
          key={c.key}
          aria-label={c.key}
          dir={c.dir}
          data-theme={c.theme}
          className="flex max-w-90 flex-col bg-card p-3"
        >
          <Tabs
            label={t.nav.label}
            idPrefix={`${c.key}-s`}
            tabs={STAFF}
            value="students"
            onChange={noop}
          />
          <TabPanel idPrefix={`${c.key}-s`} value="students">
            <p className="text-ink-2">{t.common.empty}</p>
          </TabPanel>
          <Tabs
            label={t.nav.label}
            idPrefix={`${c.key}-f`}
            tabs={FAMILY}
            value="reports"
            onChange={noop}
          />
          <TabPanel idPrefix={`${c.key}-f`} value="reports">
            <p className="text-ink-2">{t.common.empty}</p>
          </TabPanel>
        </section>
      ))}
    </div>
  );
}

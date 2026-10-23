import type { LineHealthView, NotificationEntryView } from '@ab/shared';
import { useState } from 'react';
import { ScrollX } from '@/components/ui/scroll-x';
import { Tabs, tabIds } from '@/components/ui/tabs';
import { fill } from '@/features/google-sync/google-format';
import { t } from '@/lib/i18n';
import { audienceTabs, rowsOf, type AudienceTab } from './catalogue-tabs';
import { CatalogueRow } from './CatalogueRow';

const c = t.notificationCatalogue;
/** «متى», «عبر» and «من رقم» hide on a phone (two columns: الإشعار | هل يُرسل؟; the rest sits under the name). */
const COLUMNS = [
  { label: c.columns.name, wide: false },
  { label: c.columns.when, wide: true },
  { label: c.columns.channel, wide: true },
  { label: c.columns.number, wide: true },
  { label: c.columns.state, wide: false },
];
const TABS_ID = 'catalogue-audience';

interface CatalogueTableProps {
  entries: readonly NotificationEntryView[];
  lines: readonly LineHealthView[];
}

/** The catalogue as a table, one audience at a time (guardian first); the tab labels its panel, the caption names the table. */
export function CatalogueTable({ entries, lines }: CatalogueTableProps) {
  const [tab, setTab] = useState<AudienceTab>('guardian');
  const tabs = audienceTabs(entries);
  const label = tabs.find((x) => x.value === tab)?.label ?? c.audience.guardian;
  const rows = rowsOf(entries, tab);
  const ids = tabIds(TABS_ID, tab);
  return (
    <div className="grid min-w-0 gap-2">
      <Tabs label={t.settingsPages.audiences} tabs={tabs} value={tab} onChange={setTab} className="mb-2" idPrefix={TABS_ID} />
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="min-w-0">
        {rows.length === 0 ? (
          <p className="py-3 text-sm text-ink-3">{t.settingsPages.audienceEmpty}</p>
        ) : (
          <ScrollX label={label}>
            <table className="w-full border-collapse sm:min-w-[40rem]">
              <caption className="sr-only">{fill(t.settingsPages.catalogueCaption, { audience: label })}</caption>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      scope="col"
                      className={`border-b border-rule-strong px-2 py-1.5 text-start text-xs font-semibold text-ink-3 ${col.wide ? 'max-sm:hidden' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <CatalogueRow key={entry.key} entry={entry} lines={lines} />
                ))}
              </tbody>
            </table>
          </ScrollX>
        )}
      </div>
    </div>
  );
}

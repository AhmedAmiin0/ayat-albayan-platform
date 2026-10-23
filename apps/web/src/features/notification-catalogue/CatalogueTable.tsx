import type { LineHealthView, NotificationEntryView } from '@ab/shared';
import { useState } from 'react';
import { ScrollX } from '@/components/ui/scroll-x';
import { Tabs } from '@/components/ui/tabs';
import { t } from '@/lib/i18n';
import { audienceTabs, rowsOf, type AudienceTab } from './catalogue-tabs';
import { CatalogueRow } from './CatalogueRow';

const c = t.notificationCatalogue;
const COLUMNS = [c.columns.name, c.columns.when, c.columns.channel, c.columns.number, c.columns.state];

interface CatalogueTableProps {
  entries: readonly NotificationEntryView[];
  lines: readonly LineHealthView[];
}

/** The catalogue as a table, one audience at a time (guardian first); the tab names the table. */
export function CatalogueTable({ entries, lines }: CatalogueTableProps) {
  const [tab, setTab] = useState<AudienceTab>('guardian');
  const tabs = audienceTabs(entries);
  const label = tabs.find((x) => x.value === tab)?.label ?? c.audience.guardian;
  const rows = rowsOf(entries, tab);
  return (
    <div className="grid min-w-0 gap-2">
      <Tabs label={t.settingsPages.audiences} tabs={tabs} value={tab} onChange={setTab} className="mb-2" />
      <div role="tabpanel" aria-label={label} className="min-w-0">
        {rows.length === 0 ? (
          <p className="py-3 text-sm text-ink-3">{t.settingsPages.audienceEmpty}</p>
        ) : (
          <ScrollX label={label}>
            <table className="w-full min-w-[40rem] border-collapse">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col} scope="col" className="border-b border-rule-strong px-2 py-1.5 text-start text-xs font-semibold text-ink-3">
                      {col}
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

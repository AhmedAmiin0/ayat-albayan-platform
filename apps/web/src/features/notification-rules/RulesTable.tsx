import type { LineHealthView, NotificationEntryView } from '@ab/shared';
import { useState } from 'react';
import { ScrollX } from '@/components/ui/scroll-x';
import { Tabs, tabIds } from '@/components/ui/tabs';
import { usePhone } from '@/components/ui/use-narrow';
import { t } from '@/lib/i18n';
import { audienceTabs, rowsOf, type AudienceTab } from '../notification-catalogue/catalogue-tabs';
import { ManualTable } from './ManualTable';
import { RulePhoneRow } from './phone/RulePhoneRow';
import { RuleSheet } from './phone/RuleSheet';
import { RuleRow } from './RuleRow';
import { fillText } from './rule-text';

const r = t.notificationRules;
const TABS_ID = 'rules-audience';
const DESKTOP = [r.columns.name, r.columns.channels, r.columns.number, r.columns.state, r.columns.switch];
const PHONE = [r.columns.name, r.columns.switch];
const head = 'border-b border-rule-strong px-2 py-1.5 text-start text-xs font-semibold text-ink-3';

export interface RulesTableProps {
  entries: readonly NotificationEntryView[];
  lines: readonly LineHealthView[];
  /** The audience tab in view (held by RulesSection, so the unsaved count can show a row's tab). */
  tab: AudienceTab;
  onTab: (tab: AudienceTab) => void;
}

/**
 * «الإشعارات», one audience at a time (ولي الأمر · المعلم/ة · العميل · فريق الأكاديمية · يدوي):
 * five columns from 640px; on a phone two (الإشعار | التشغيل) and a tap opens the row's sheet.
 */
export function RulesTable({ entries, lines, tab, onTab }: RulesTableProps) {
  const phone = usePhone();
  const [open, setOpen] = useState<string | null>(null);
  const tabs = audienceTabs(entries);
  const label = tabs.find((x) => x.value === tab)?.label ?? t.notificationCatalogue.audience.guardian;
  const rows = rowsOf(entries, tab);
  const ids = tabIds(TABS_ID, tab);
  const caption = fillText(r.caption, { audience: label });
  const opened = entries.find((e) => e.key === open);
  return (
    <div className="grid min-w-0 gap-2">
      <Tabs label={t.settingsPages.audiences} tabs={tabs} value={tab} onChange={onTab} idPrefix={TABS_ID} />
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="min-w-0">
        {rows.length === 0 ? (
          <p className="py-3 text-sm text-ink-3">{t.settingsPages.audienceEmpty}</p>
        ) : tab === 'manual' ? (
          <ManualTable rows={rows} caption={caption} />
        ) : (
          <ScrollX label={label}>
            <table className="w-full border-collapse sm:min-w-[52rem]">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {(phone ? PHONE : DESKTOP).map((col) => (
                    <th key={col} scope="col" className={head}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) =>
                  phone ? <RulePhoneRow key={entry.key} entry={entry} onOpen={setOpen} /> : <RuleRow key={entry.key} entry={entry} lines={lines} />,
                )}
              </tbody>
            </table>
          </ScrollX>
        )}
      </div>
      {phone && opened && <RuleSheet entry={opened} lines={lines} onClose={() => setOpen(null)} />}
    </div>
  );
}

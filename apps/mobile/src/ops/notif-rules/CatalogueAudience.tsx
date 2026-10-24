import type { NotificationsOverview } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FilterPills } from '@/ui/FilterPills';
import { audienceTabs, rowsOf, type AudienceTab } from './audience-tabs';
import { CatalogueRow } from './CatalogueRow';
import type { CatalogueToggles } from './use-catalogue-toggles';

export interface CatalogueAudienceProps {
  data: NotificationsOverview;
  /** notifications.manage held: editable rows get a switch. */
  canManage: boolean;
  toggles: CatalogueToggles;
  /** The pill shown first (the overview opens an audience); guardian when absent. */
  initialAudience?: AudienceTab;
}

/**
 * The rows one audience at a time (docs/26b §6 1.10, same pills as the web): ولي الأمر first, so
 * each view fits a 390×844 phone. Changing the pill closes an open question (its row leaves view).
 */
export function CatalogueAudience({ data, canManage, toggles, initialAudience }: CatalogueAudienceProps) {
  const [tab, setTab] = useState<AudienceTab>(initialAudience ?? 'guardian');
  const rows = rowsOf(data.entries, tab);
  const choose = (next: AudienceTab) => {
    if (next !== tab) toggles.cancel();
    setTab(next);
  };
  return (
    <>
      <FilterPills items={audienceTabs(data.entries)} value={tab} onChange={choose} accessibilityLabel={t.settingsPages.audiences} />
      {rows.length === 0 ? (
        <Note>{t.mobileNotificationRules.audienceEmpty}</Note>
      ) : (
        <View style={{ marginHorizontal: -16 }}>
          {rows.map((e) => (
            <CatalogueRow key={e.key} entry={e} canManage={canManage} reach={data.reach} toggles={toggles} />
          ))}
        </View>
      )}
    </>
  );
}

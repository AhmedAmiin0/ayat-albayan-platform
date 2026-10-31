import type { NotificationsOverview } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { audienceTabs, rowsOf, type AudienceTab } from '@/ops/notif-rules/lib/audience-tabs';
import { CatalogueRow } from './CatalogueRow';
import type { CatalogueToggles } from '@/ops/notif-rules/hooks/use-catalogue-toggles';
import { InsetGroup } from '@/core/ui/surface/inset';

interface CatalogueAudienceProps {
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
        <InsetGroup>
          {rows.map((e) => (
            <CatalogueRow key={e.key} entry={e} canManage={canManage} reach={data.reach} toggles={toggles} />
          ))}
        </InsetGroup>
      )}
    </>
  );
}

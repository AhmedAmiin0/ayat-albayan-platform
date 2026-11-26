import type { AudienceTab, NotificationsOverview } from '@ab/shared';
import { useState } from 'react';
import { t, FilterPills, InsetGroup } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { audienceTabs, rowsOf } from '@/ops/notif-rules/lib/audience-tabs';
import { CatalogueRow } from './CatalogueRow';
import type { CatalogueToggles } from '@/ops/notif-rules/hooks/use-catalogue-toggles';

interface CatalogueAudienceProps {
  data: NotificationsOverview;
  /** notifications.manage held: editable rows get a switch. */
  canManage: boolean;
  toggles: CatalogueToggles;
  /** The pill shown first (the overview opens an audience); guardian when absent. */
  initialAudience?: AudienceTab;
}

/** docs/26b §6 1.10: guardian first so each view fits a 390x844 phone. */
export function CatalogueAudience({
  data,
  canManage,
  toggles,
  initialAudience,
}: CatalogueAudienceProps) {
  const [tab, setTab] = useState<AudienceTab>(initialAudience ?? 'guardian');
  const rows = rowsOf(data.entries, tab);
  const choose = (next: AudienceTab) => {
    if (next !== tab) toggles.cancel();
    setTab(next);
  };
  return (
    <>
      <FilterPills
        items={audienceTabs(data.entries)}
        value={tab}
        onChange={choose}
        accessibilityLabel={t.settingsPages.audiences}
      />
      {rows.length === 0 ? (
        <Note>{t.mobileNotificationRules.audienceEmpty}</Note>
      ) : (
        <InsetGroup>
          {rows.map((e) => (
            <CatalogueRow
              key={e.key}
              entry={e}
              canManage={canManage}
              reach={data.reach}
              toggles={toggles}
            />
          ))}
        </InsetGroup>
      )}
    </>
  );
}

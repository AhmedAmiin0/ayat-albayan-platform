import type { NotificationAudience } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SettingsViewContext } from '@/components/settings/settings-view';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { Tabs } from '@ab/web-kit/components/ui/layout/tabs';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { settingsQuery } from '@/lib/settings/settings-api';
import { settingsMetaQuery } from '@/features/platform/settings/settings-meta-api';
import { COMMUNICATIONS_TABS_ID, CommunicationsBody } from './communications/CommunicationsBody';
import { SendingState } from './communications/SendingState';
import { ModuleHead } from './ModuleHead';
import { COMMUNICATIONS_TABS, type CommunicationsTab } from './page-search';

export interface CommunicationsPageProps {
  tab: CommunicationsTab;
  /** Guardian when none. */
  audience?: NotificationAudience | undefined;
  onTab: (tab: CommunicationsTab) => void;
  /** Asks before leaving the page with unsaved rule rows (the route passes LeaveGuard). */
  renderGuard?: (names: readonly string[]) => ReactNode;
}

/** The tab value stays 'catalogue' for old links (docs/26b §3). */
const tabLabel = (value: CommunicationsTab): string =>
  value === 'catalogue' ? t.notificationRules.tabLabel : t.settingsPages.communicationsTabs[value];
const TABS = COMMUNICATIONS_TABS.map((value) => ({ value, label: tabLabel(value) }));

/** Only the tab in view is mounted; rule drafts live above the tabs (docs/23 §2d, docs/26b §3). */
export function CommunicationsPage({ tab, audience, onTab, renderGuard }: CommunicationsPageProps) {
  const settings = useQuery(settingsQuery);
  const meta = useQuery(settingsMetaQuery);
  return (
    <SettingsViewContext.Provider value={{ query: '', meta: meta.data ?? {} }}>
      <ModuleHead title={t.settingsPages.communications}>{settings.data && <SendingState settings={settings.data} />}</ModuleHead>
      <Tabs label={t.settingsPages.tabs} tabs={TABS} value={tab} onChange={onTab} idPrefix={COMMUNICATIONS_TABS_ID} />
      <QueryState query={settings} quiet errorText={t.settingsPages.loadError}>
        {(data) => <CommunicationsBody tab={tab} audience={audience} settings={data} renderGuard={renderGuard} />}
      </QueryState>
    </SettingsViewContext.Provider>
  );
}

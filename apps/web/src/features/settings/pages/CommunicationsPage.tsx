import type { NotificationAudience } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SettingsViewContext } from '@/components/settings/settings-view';
import { Tabs } from '@/components/ui/layout/tabs';
import { t } from '@/lib/i18n';
import { settingsQuery } from '@/lib/settings-api';
import { settingsMetaQuery } from '../settings-meta-api';
import { COMMUNICATIONS_TABS_ID, CommunicationsBody } from './communications/CommunicationsBody';
import { LoadState } from './communications/LoadState';
import { SendingState } from './communications/SendingState';
import { ModuleHead } from './ModuleHead';
import { COMMUNICATIONS_TABS, type CommunicationsTab } from './page-search';

export interface CommunicationsPageProps {
  /** The tab in view (`?tab=`, «نظرة عامة» by default). */
  tab: CommunicationsTab;
  /** «الإشعارات» opens on this audience (`?audience=`); guardian when none. */
  audience?: NotificationAudience | undefined;
  onTab: (tab: CommunicationsTab) => void;
  /** Asks before leaving the page with unsaved rule rows (the route passes LeaveGuard). */
  renderGuard?: (names: readonly string[]) => ReactNode;
}

/** «ماذا يُرسل ومتى» is «الإشعارات» now (editable, docs/26b §3); the tab value stays 'catalogue'. */
const tabLabel = (value: CommunicationsTab): string =>
  value === 'catalogue' ? t.notificationRules.tabLabel : t.settingsPages.communicationsTabs[value];
const TABS = COMMUNICATIONS_TABS.map((value) => ({ value, label: tabLabel(value) }));

/**
 * /admin/settings/communications «التواصل» (docs/23 §2d, docs/26b §3; /admin/communications opens it):
 * one tab at a time — «نظرة عامة» (the two switches, the numbers, what sends now, the families'
 * number), «الأرقام» (numbers and lines), «الإشعارات» (the editable catalogue), «القوالب» and
 * «الحماية» (CRM cut-over, test guards, Kapso). The sending state stays in the head on every tab. Only
 * the tab in view is mounted (its queries load on demand); the rule drafts live above the tabs.
 */
export function CommunicationsPage({ tab, audience, onTab, renderGuard }: CommunicationsPageProps) {
  const settings = useQuery(settingsQuery);
  const meta = useQuery(settingsMetaQuery);
  return (
    <SettingsViewContext.Provider value={{ query: '', meta: meta.data ?? {} }}>
      <ModuleHead title={t.settingsPages.communications}>{settings.data && <SendingState settings={settings.data} />}</ModuleHead>
      <Tabs label={t.settingsPages.tabs} tabs={TABS} value={tab} onChange={onTab} idPrefix={COMMUNICATIONS_TABS_ID} />
      {settings.data ? (
        <CommunicationsBody tab={tab} audience={audience} settings={settings.data} renderGuard={renderGuard} />
      ) : (
        <LoadState error={settings.isError} onRetry={() => void settings.refetch()} />
      )}
    </SettingsViewContext.Provider>
  );
}

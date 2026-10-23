import type { AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SettingsViewContext } from '@/components/settings/settings-view';
import { FormAlert } from '@/components/ui/form-alert';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { settingsQuery } from '@/lib/settings-api';
import { settingsMetaQuery } from '../settings-meta-api';
import { CatalogueTab } from './communications/CatalogueTab';
import { NumbersTab } from './communications/NumbersTab';
import { SendingState } from './communications/SendingState';
import { SendingTab } from './communications/SendingTab';
import { TemplatesTab } from './communications/TemplatesTab';
import { ModuleHead } from './ModuleHead';
import { COMMUNICATIONS_TABS, type CommunicationsTab } from './page-search';

export interface CommunicationsPageProps {
  /** The tab in view (`?tab=`, «الإرسال» by default). */
  tab: CommunicationsTab;
  onTab: (tab: CommunicationsTab) => void;
}

const TABS = COMMUNICATIONS_TABS.map((value) => ({ value, label: t.settingsPages.communicationsTabs[value] }));

function TabBody({ tab, settings, onNote }: { tab: CommunicationsTab; settings: AcademySettings; onNote: (message: string) => void }) {
  if (tab === 'numbers') return <NumbersTab onNote={onNote} />;
  if (tab === 'catalogue') return <CatalogueTab settings={settings} onSaved={() => onNote(t.settings.saved)} />;
  if (tab === 'templates') return <TemplatesTab />;
  return <SendingTab settings={settings} />;
}

/**
 * /admin/settings/communications «التواصل» (docs/26b §3, docs/26 26-P3): what was the messaging part
 * of the old long settings page, one tab at a time — «الإرسال» (the switches), «الأرقام» (numbers and
 * lines), «ماذا يُرسل ومتى» (the catalogue and the timing fields) and «القوالب». The sending state
 * stays in the head on every tab. Only the tab in view is mounted (its queries load on demand).
 */
export function CommunicationsPage({ tab, onTab }: CommunicationsPageProps) {
  const settings = useQuery(settingsQuery);
  const meta = useQuery(settingsMetaQuery);
  const [note, setNote] = useState<string | null>(null);
  const label = t.settingsPages.communicationsTabs[tab];
  return (
    <SettingsViewContext.Provider value={{ query: '', meta: meta.data ?? {} }}>
      <ModuleHead title={t.settingsPages.communications}>{settings.data && <SendingState settings={settings.data} />}</ModuleHead>
      <Tabs label={t.settingsPages.tabs} tabs={TABS} value={tab} onChange={onTab} />
      {settings.isError && <FormAlert>{t.common.error}</FormAlert>}
      {settings.isPending && <ListSkeleton rows={6} />}
      {settings.data && (
        <div role="tabpanel" aria-label={label} className="min-w-0">
          <TabBody tab={tab} settings={settings.data} onNote={setNote} />
        </div>
      )}
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </SettingsViewContext.Provider>
  );
}

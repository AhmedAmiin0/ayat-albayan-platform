import { useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { NotificationCatalogue } from './NotificationCatalogue';
import { NumbersList } from './NumbersList';
import { ReadOnlySettings } from './ReadOnlySettings';
import { SubScreenHeader } from './SubScreenHeader';
import { useSettings } from './use-settings';

export type CommsTab = 'sending' | 'notifications' | 'numbers';

/** The tabs, in the web page's order: الإرسال · الإشعارات · الأرقام (read at render: admins' overrides apply). */
export const commsTabs = (): { value: CommsTab; label: string }[] => [
  { value: 'sending', label: t.settingsPages.communicationsTabs.sending },
  { value: 'notifications', label: t.settingsValues.groups.notifications },
  { value: 'numbers', label: t.settingsPages.communicationsTabs.numbers },
];

/** «الإرسال»: the send state (read-only, it sends real WhatsApp messages). */
function SendingTab() {
  const query = useSettings();
  if (query.data) return <ReadOnlySettings settings={query.data} />;
  return query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null;
}

/**
 * «التواصل» on the phone (docs/26b §4): one tab at a time instead of one long scroll — the send
 * state (read-only), «ماذا يُرسل ومتى» and «الأرقام». Numbers, credentials and templates are edited on the web.
 */
export function CommunicationsScreen() {
  const [tab, setTab] = useState<CommsTab>('sending');
  return (
    <Screen>
      <SubScreenHeader title={t.settingsPages.communications} />
      <FilterPills accessibilityLabel={t.settingsPages.tabs} items={commsTabs()} value={tab} onChange={setTab} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingTop: 8, paddingBottom: 32 }}>
        {tab === 'sending' ? <SendingTab /> : null}
        {tab === 'notifications' ? <NotificationCatalogue /> : null}
        {tab === 'numbers' ? <NumbersList /> : null}
      </ScrollView>
    </Screen>
  );
}

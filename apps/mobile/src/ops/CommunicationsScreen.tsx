import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { NotificationCatalogue } from './NotificationCatalogue';
import { NumbersList } from './NumbersList';
import { ReadOnlySettings } from './ReadOnlySettings';
import { SubScreenHeader } from './SubScreenHeader';
import { useSettings } from './use-settings';

/**
 * «التواصل» on the phone (docs/26b §4): the send state (read-only), «ماذا يُرسل ومتى» and «الأرقام»,
 * as they were on the old settings screen. Numbers, credentials and templates are edited on the web.
 */
export function CommunicationsScreen() {
  const query = useSettings();
  return (
    <Screen>
      <SubScreenHeader title={t.settingsPages.communications} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
        {query.data ? (
          <ReadOnlySettings settings={query.data} />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : null}
        <NotificationCatalogue />
        <NumbersList />
      </ScrollView>
    </Screen>
  );
}

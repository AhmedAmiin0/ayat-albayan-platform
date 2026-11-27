import { View } from 'react-native';
import { Button, t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { AlertSections } from '@/nav/AlertSections';
import { FamilyHeader } from '@/nav/FamilyHeader';
import { FamilyPage } from '@/nav/FamilyPage';
import { useAlertsScreen } from './use-alerts-screen';

/** A tap marks the row read and opens its target (@ab/client-core alertTarget). */
export function AlertsScreen() {
  const { list, markRead, unread } = useAlertsScreen();
  return (
    <FamilyPage
      header={<FamilyHeader title={t.bell.title} back />}
      onRefresh={() => list.refetch()}
    >
      {unread ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            variant="ghost"
            label={t.portal.app.alerts.markAll}
            onPress={() => markRead.mutate(undefined)}
          />
        </View>
      ) : null}
      <LoadState query={list}>{(page) => <AlertSections page={page} />}</LoadState>
    </FamilyPage>
  );
}

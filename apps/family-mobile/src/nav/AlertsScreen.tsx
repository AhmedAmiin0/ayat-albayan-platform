import { View } from 'react-native';
import { Button, t, useMarkRead, useNotifications } from '@ab/mobile-kit';
import { LoadState } from '#/ui/index.ts';
import { AlertSections } from './AlertSections';
import { FamilyHeader } from './FamilyHeader';
import { FamilyPage } from './FamilyPage';

/**
 * «الإشعارات» (canvas Alerts), pushed above the tabs: GET /me/notifications by day; a tap marks
 * the row read and opens its report, child, package or chat (@ab/client-core alertTarget);
 * «تعليم الكل كمقروء» while any is unread.
 */
export function AlertsScreen() {
  const list = useNotifications();
  const markRead = useMarkRead();
  const unread = (list.data?.unread ?? 0) > 0;
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

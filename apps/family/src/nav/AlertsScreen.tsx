import { alertSections, alertTarget, type AlertGroup } from '@ab/client-core';
import type { NotificationItem } from '@ab/shared';
import { View } from 'react-native';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  InsetGroup,
  SkeletonCard,
  t,
  type,
  useMarkRead,
  useNotifications,
  useNow,
  useTheme,
} from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { AlertRow } from './AlertRow';
import { FamilyHeader } from './FamilyHeader';
import { FamilyPage } from './FamilyPage';
import { openAlert } from './hrefs';

const GROUP: Record<AlertGroup, () => string> = {
  today: () => t.portal.app.alerts.today,
  yesterday: () => t.portal.app.alerts.yesterday,
  week: () => t.portal.app.alerts.week,
  older: () => t.portal.app.alerts.older,
};

/**
 * «الإشعارات» (canvas Alerts), pushed above the tabs: GET /me/notifications under «اليوم» / «أمس» /
 * «هذا الأسبوع»; a tap marks the row read and opens its report, child or package
 * (@ab/client-core alertTarget); «تعليم الكل كمقروء» while any is unread.
 */
export function AlertsScreen() {
  const { color } = useTheme();
  const list = useNotifications();
  const markRead = useMarkRead();
  const clock = useFamilyClock();
  const sections = alertSections(list.data?.items ?? [], useNow(), clock.tz);
  const open = (item: NotificationItem): void => {
    if (item.read_at === null) markRead.mutate([item.id]);
    const target = alertTarget(item);
    if (target) openAlert(target);
  };
  return (
    <FamilyPage
      header={<FamilyHeader title={t.bell.title} back />}
      onRefresh={() => list.refetch()}
    >
      {(list.data?.unread ?? 0) > 0 ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            variant="ghost"
            label={t.portal.app.alerts.markAll}
            onPress={() => markRead.mutate(undefined)}
          />
        </View>
      ) : null}
      {list.isPending ? <SkeletonCard /> : null}
      {list.isError && !list.data ? (
        <ErrorState onRetry={() => void list.refetch()} message={t.bell.loadError} />
      ) : null}
      {list.data && sections.length === 0 ? <EmptyState title={t.bell.empty} /> : null}
      {sections.map((s) => (
        <View key={s.group} style={{ gap: 8 }}>
          <AppText
            accessibilityRole="header"
            style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}
          >
            {GROUP[s.group]()}
          </AppText>
          <InsetGroup>
            {s.items.map((item) => (
              <AlertRow key={item.id} item={item} clock={clock} onPress={open} />
            ))}
          </InsetGroup>
        </View>
      ))}
    </FamilyPage>
  );
}

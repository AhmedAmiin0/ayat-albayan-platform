import { alertSections, alertTarget, type AlertGroup } from '@ab/client-core';
import type { NotificationsPage, NotificationItem } from '@ab/shared';
import { View } from 'react-native';
import {
  AppText,
  EmptyState,
  InsetGroup,
  t,
  type,
  useMarkRead,
  useNow,
  useTheme,
} from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { AlertRow } from './AlertRow';
import { openAlert } from './hrefs';

const GROUP: Record<AlertGroup, () => string> = {
  today: () => t.portal.app.alerts.today,
  yesterday: () => t.portal.app.alerts.yesterday,
  week: () => t.portal.app.alerts.week,
  older: () => t.portal.app.alerts.older,
};

/** A tap marks the row read and opens it. */
export function AlertSections({ page }: { page: NotificationsPage }) {
  const { color } = useTheme();
  const markRead = useMarkRead();
  const clock = useFamilyClock();
  const sections = alertSections(page.items, useNow(), clock.tz);
  const open = (item: NotificationItem): void => {
    if (item.read_at === null) markRead.mutate([item.id]);
    const target = alertTarget(item);
    if (target) openAlert(target);
  };
  if (sections.length === 0) return <EmptyState title={t.bell.empty} />;
  const head = { fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 };
  return sections.map((s) => (
    <View key={s.group} style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={head}>
        {GROUP[s.group]()}
      </AppText>
      <InsetGroup>
        {s.items.map((item) => (
          <AlertRow key={item.id} item={item} clock={clock} onPress={open} />
        ))}
      </InsetGroup>
    </View>
  ));
}

import type { NotificationItem } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

export interface AlertRowProps {
  item: NotificationItem;
  clock: ClockOptions;
  onPress: (item: NotificationItem) => void;
}

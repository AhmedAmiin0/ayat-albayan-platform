import { type NotificationItem } from '@ab/shared';
import { clockOf, type ClockOptions } from '@ab/time';
import { Pressable, View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';

interface AlertRowProps {
  item: NotificationItem;
  clock: ClockOptions;
  onPress: (item: NotificationItem) => void;
}

/** One bell row (canvas Alerts): title, body, time; unread = a dot and the word, not colour. */
export function AlertRow({ item, clock, onPress }: AlertRowProps) {
  const { color } = useTheme();
  const unread = item.read_at === null;
  const when = clockOf(new Date(item.created_at), clock);
  const rest = unread ? color.goldWash : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `${item.title}، ${t.bell.unread}` : item.title}
      onPress={() => onPress(item)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: pressed ? color.lapisWash : rest,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[unread ? 700 : 500], color: color.ink }}>
          {item.title}
        </AppText>
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
          {item.body ? `${item.body} · ${when}` : when}
        </AppText>
      </View>
      {unread ? (
        <View
          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.lapisFill }}
        />
      ) : null}
    </Pressable>
  );
}

import type { TeacherChannelRow } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { type, useTheme, AppText, Avatar, ListRow, useClockCycle, useNow } from '@ab/mobile-kit';
import { rowTime } from '@/inbox';
import { CountBadge } from './CountBadge';
import { previewOf } from './teacher-row';

/**
 * One student of «رسائل الطلاب» (ChatXTeacherList): a 44pt avatar, the name and code, the last
 * message after who wrote it; at the end its time (brand while unread) over the count.
 */
export function TeacherChannelItem({ item }: { item: TeacherChannelRow }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const now = useNow();
  const unread = item.unread > 0;
  const time = rowTime(item.last_message?.created_at, cycle, { now });
  const timeStyle = {
    fontFamily: type.ui[unread ? 600 : 500],
    fontSize: type.size['2xs'],
    color: unread ? color.lapis : color.ink3,
  };
  return (
    <ListRow
      leading={<Avatar name={item.student_name} size="row" decorative />}
      title={item.student_name}
      meta={item.student_code}
      subtitle={previewOf(item)}
      trailing={
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {time ? <AppText style={timeStyle}>{time}</AppText> : null}
          {unread ? <CountBadge n={item.unread} /> : null}
        </View>
      }
      onPress={() => router.push(`/teacher/more/messages/${item.student_id}`)}
    />
  );
}

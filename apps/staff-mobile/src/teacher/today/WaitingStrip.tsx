import { View } from 'react-native';
import { AppText, Avatar, type, useTheme } from '@ab/mobile-kit';
import type { Waiting } from '@/teacher/lessons/teacher-word';

/**
 * «يوسف ينتظرك في الغرفة» over «دخل منذ 3 دقائق» (canvas RoomXTeacherToday), before the hero's
 * buttons: a 40pt face with the presence dot, read as a status.
 */
export function WaitingStrip({ who }: { who: Waiting }) {
  const { color } = useTheme();
  return (
    <View
      testID="teacher-waiting"
      role="status"
      accessible
      accessibilityLabel={`${who.line}، ${who.since}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Avatar name={who.name} size="md" decorative />
        <View
          style={{
            position: 'absolute',
            bottom: 1,
            end: 1,
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: color.raised,
            backgroundColor: color.ok,
          }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
          {who.line}
        </AppText>
        <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{who.since}</AppText>
      </View>
    </View>
  );
}

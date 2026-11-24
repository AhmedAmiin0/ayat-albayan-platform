import { presenceLine } from '@ab/shared';
import { View } from 'react-native';
import { t, AppText, PresenceLabel, type, useTheme } from '@ab/mobile-kit';
import type { PresenceClock } from '@/core/lib/presence';
import { roleText } from '@/users/shared/format';
import type { StaffLine } from './staff-order';

export function StaffPresenceRow({ line, clock }: { line: StaffLine; clock: PresenceClock }) {
  const { color } = useTheme();
  const { row, online } = line;
  const text = presenceLine({ ...clock, online, lastSeenAt: row.last_seen_at });
  return (
    <View
      testID={`staff-presence-${row.profile_id}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
    >
      <AppText
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontFamily: type.ui[500],
          fontSize: type.size.sm,
          color: color.ink,
        }}
      >
        {row.name}
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>
          {`${t.common.listSeparator}${roleText(row.role)}`}
        </AppText>
      </AppText>
      <View style={{ flex: 1 }} />
      <PresenceLabel text={text || t.presence.staffNever} online={online} />
    </View>
  );
}

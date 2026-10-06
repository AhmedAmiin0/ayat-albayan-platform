import type { MeetingView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { StatusChip } from '@/ui/StatusChip';
import { meetingWhen } from './meeting-text';
import { MeetingActions } from './MeetingActions';

const L = t.meetings.internal;

/** One internal meeting: title, open/ended chip, creation time, and the actions the caller may take. */
export function MeetingRow({ meeting }: { meeting: MeetingView }) {
  const { color } = useTheme();
  const open = meeting.state === 'open';
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText numberOfLines={2} style={{ flex: 1, fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>
          {meeting.title}
        </AppText>
        <StatusChip
          tone={open ? 'ok' : 'neutral'}
          glyph={open ? 'fill' : 'struck'}
          label={open ? L.open : L.ended}
          size="sm"
        />
      </View>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2, fontVariant: ['tabular-nums'] }}>
        {meetingWhen(meeting.created_at)}
      </AppText>
      <MeetingActions meeting={meeting} />
    </View>
  );
}

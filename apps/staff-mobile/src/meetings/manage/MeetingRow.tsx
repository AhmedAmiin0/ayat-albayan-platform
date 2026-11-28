import type { MeetingView } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t, shape, type, useTheme, AppText, StatusChip } from '@ab/mobile-kit';
import { opensLine, scheduleLine } from '@/meetings/invite/invite-text';
import { meetingWhen } from './meeting-text';
import { MeetingActions } from './MeetingActions';

const L = t.meetings.internal;
const M = t.meetingInvites.list;

function detailLine(meeting: MeetingView, tz: string, cycle: ClockCycle): string {
  const when = meeting.starts_at ? scheduleLine(meeting, tz, cycle) : `${M.instant} · ${meetingWhen(meeting.created_at, tz, cycle)}`;
  const count = meeting.invitees_count > 0 ? M.inviteesCount.replace('{n}', String(meeting.invitees_count)) : null;
  return [when, count, meeting.my_invite ? M.invitedYou : null].filter(Boolean).join(' · ');
}

/** One meeting I created or am invited to: title, state chip, time and my allowed actions. */
export function MeetingRow({ meeting, tz }: { meeting: MeetingView; tz: string }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const open = meeting.state === 'open' && !meeting.cancelled_at;
  const chip = meeting.cancelled_at ? M.cancelled : open ? L.open : L.ended;
  const opens = opensLine(meeting, tz, cycle);
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2, fontVariant: ['tabular-nums' as const] };
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
        <AppText
          numberOfLines={2}
          style={{ flex: 1, fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}
        >
          {meeting.title}
        </AppText>
        <StatusChip tone={open ? 'ok' : 'neutral'} glyph={open ? 'fill' : 'struck'} label={chip} size="sm" />
      </View>
      <AppText style={small}>{detailLine(meeting, tz, cycle)}</AppText>
      {opens ? <AppText style={small}>{opens}</AppText> : null}
      <MeetingActions meeting={meeting} tz={tz} />
    </View>
  );
}

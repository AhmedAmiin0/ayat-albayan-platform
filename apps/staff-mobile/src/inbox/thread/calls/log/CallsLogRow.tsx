import { callEntryKind, type CallView } from '@ab/shared';
import { View } from 'react-native';
import { type, useTheme, AppText, Avatar, ListRow, CallArrowIcon } from '@ab/mobile-kit';
import { clockAt } from '@/inbox/shared/format';
import { callEntryText, callerName, callInk } from '@/inbox/thread/calls/entries/call-text';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CallsLogRowProps {
  call: CallView;
  showsPhone: boolean;
  onOpen: () => void;
}

export function CallsLogRow({ call, showsPhone, onOpen }: CallsLogRowProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { color } = useTheme();
  const kind = callEntryKind(call);
  const ink = callInk(kind, color);
  const name = callerName(call, showsPhone);
  return (
    <ListRow
      leading={<Avatar name={call.display_name ?? ''} id={call.phone_e164} decorative />}
      title={name}
      subtitle={callEntryText(call)}
      subtitleLeading={<CallArrowIcon out={call.direction === 'outbound'} color={ink} size={14} />}
      trailing={
        <View>
          <AppText style={{ fontSize: type.size['2xs'], color: kind === 'missed' ? color.bad : color.ink3, fontVariant: ['tabular-nums'] }}>
            {clockAt(Date.parse(call.started_at), cycle, tz)}
          </AppText>
        </View>
      }
      onPress={onOpen}
    />
  );
}

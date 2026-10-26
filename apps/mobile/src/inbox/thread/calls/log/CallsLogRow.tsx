import { callEntryKind, type CallView } from '@ab/shared';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ListRow } from '@/core/ui/layout/ListRow';
import { clockAt } from '../../../shared/format';
import { CallArrowIcon } from '../screen/call-icons';
import { initialsOf } from '../screen/Initials';
import { callEntryText, callerName, callInk } from '../entries/call-text';

export interface CallsLogRowProps {
  call: CallView;
  showsPhone: boolean;
  onOpen: () => void;
}

/** One call of the log (WhatsApp's «المكالمات»): who, the direction arrow and its words, the time. */
export function CallsLogRow({ call, showsPhone, onOpen }: CallsLogRowProps) {
  const { color } = useTheme();
  const kind = callEntryKind(call);
  const ink = callInk(kind, color);
  const name = callerName(call, showsPhone);
  return (
    <ListRow
      leading={<Avatar letter={initialsOf(name).slice(0, 1)} />}
      title={name}
      subtitle={callEntryText(call)}
      subtitleLeading={<CallArrowIcon out={call.direction === 'outbound'} color={ink} size={14} />}
      trailing={
        <View>
          <AppText style={{ fontSize: type.size['2xs'], color: kind === 'missed' ? color.bad : color.ink3, fontVariant: ['tabular-nums'] }}>
            {clockAt(Date.parse(call.started_at))}
          </AppText>
        </View>
      }
      onPress={onOpen}
    />
  );
}

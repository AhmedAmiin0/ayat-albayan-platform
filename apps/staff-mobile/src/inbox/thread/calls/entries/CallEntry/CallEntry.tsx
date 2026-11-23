import { callEntryKind, type CallView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import {
  t,
  shape,
  type,
  useTheme,
  AppText,
  bubbleSide,
  CallArrowIcon,
  PhoneIcon,
} from '@ab/mobile-kit';
import { clockAt } from '@/inbox/shared/format';
import { callEntryText, callInk } from '@/inbox/thread/calls/entries/call-text';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CallEntryProps {
  call: CallView;
  /** Tap to call back (the header icon's flow); absent while calling is not possible. */
  onCallBack?: ((call: CallView) => void) | undefined;
}

/** docs/28 §5: calls merge by time with the messages; a tap calls back. */
export function CallEntry({ call, onCallBack }: CallEntryProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { color } = useTheme();
  const kind = callEntryKind(call);
  const ink = callInk(kind, color);
  const ours = call.direction === 'outbound';
  const text = callEntryText(call);
  return (
    <Pressable
      testID={`call-entry-${call.id}`}
      accessibilityRole={onCallBack ? 'button' : 'text'}
      accessibilityLabel={onCallBack ? `${text} — ${t.calls.callBack}` : text}
      disabled={!onCallBack}
      onPress={onCallBack ? () => onCallBack(call) : undefined}
      style={({ pressed }) => ({
        alignSelf: bubbleSide(ours).align,
        maxWidth: '80%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: shape.radius.lg,
        backgroundColor: pressed ? color.sunk : ours ? color.lapisWash : color.raised,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: color.neutralSoft }}>
        <PhoneIcon color={ink} size={18} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <AppText numberOfLines={1} style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: kind === 'missed' ? color.bad : color.ink }}>
          {text}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CallArrowIcon out={ours} color={ink} size={12} />
          <AppText style={{ fontSize: type.size['2xs'], color: color.ink3, fontVariant: ['tabular-nums'] }}>{clockAt(Date.parse(call.started_at), cycle, tz)}</AppText>
        </View>
      </View>
    </Pressable>
  );
}

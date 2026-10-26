import { callEntryKind, type CallView } from '@ab/shared';
import { I18nManager, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { bubbleSide } from '../../../messages/hooks/bubble-side';
import { clockAt } from '../../../shared/format';
import { CallArrowIcon, PhoneIcon } from '../screen/call-icons';
import { callEntryText, callInk } from './call-text';

export interface CallEntryProps {
  call: CallView;
  /** Tap to call back (the header icon's flow); absent while calling is not possible. */
  onCallBack?: (() => void) | undefined;
}

/**
 * A call in the chat, merged by time with the messages (docs/28 §5), WhatsApp's: on the caller's side
 * (ours right, the family's left), the handset, «مكالمة صوتية صادرة · 2:14» with its arrow, a missed
 * one in red, the time. A tap calls back.
 */
export function CallEntry({ call, onCallBack }: CallEntryProps) {
  const { color } = useTheme();
  const kind = callEntryKind(call);
  const ink = callInk(kind, color);
  const ours = call.direction === 'outbound';
  const side = bubbleSide(ours, I18nManager.isRTL);
  const text = callEntryText(call);
  return (
    <Pressable
      testID={`call-entry-${call.id}`}
      accessibilityRole={onCallBack ? 'button' : 'text'}
      accessibilityLabel={onCallBack ? `${text} — ${t.calls.callBack}` : text}
      disabled={!onCallBack}
      onPress={onCallBack}
      style={({ pressed }) => ({
        alignSelf: side.align,
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
          <AppText style={{ fontSize: type.size['2xs'], color: color.ink3, fontVariant: ['tabular-nums'] }}>{clockAt(Date.parse(call.started_at))}</AppText>
        </View>
      </View>
    </Pressable>
  );
}

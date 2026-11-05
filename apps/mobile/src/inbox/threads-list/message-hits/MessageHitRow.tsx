import { formatPhone, type MessageSearchHit } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';
import { rowTime } from '@/inbox/messages/days/day-label';
import { SearchMarks } from '@/inbox/thread/search';
import { type, useTheme } from '@/theme';

interface MessageHitRowProps {
  hit: MessageSearchHit;
  /** The searched words, marked in the snippet. */
  q: string;
  /** The list's one clock (useToday). */
  now: Date;
  onOpen: (hit: MessageSearchHit) => void;
}

/**
 * One hit under «الرسائل» (docs/37): the chat's avatar and name (or its number), the message's
 * day or clock as the chats' rows, and the snippet with the words marked. Tap → that chat at it.
 */
export function MessageHitRow({ hit, q, now, onOpen }: MessageHitRowProps) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const name = hit.display_name ?? ltr(formatPhone(hit.phone_e164));
  const small = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  return (
    <Pressable
      testID="message-hit"
      accessibilityRole="button"
      accessibilityLabel={`${name} · ${hit.snippet}`}
      onPress={() => onOpen(hit)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: pressed ? color.sunk : color.raised,
      })}
    >
      <Avatar name={hit.display_name ?? ''} id={hit.phone_e164} decorative />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AppText
            numberOfLines={1}
            style={{ flex: 1, fontFamily: type.ui[600], color: color.ink }}
          >
            {name}
          </AppText>
          <AppText style={{ ...small, color: color.ink3, fontVariant: ['tabular-nums'] }}>
            {rowTime(hit.created_at, cycle, { now })}
          </AppText>
        </View>
        <AppText
          numberOfLines={2}
          style={{ ...small, fontFamily: type.ui[400], color: color.ink2 }}
        >
          <SearchMarks text={hit.snippet} q={q} />
        </AppText>
      </View>
    </Pressable>
  );
}

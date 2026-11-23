import { formatPhone, type MessageSearchHit } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t, Avatar, AppText, ltr, type, useTheme } from '@ab/mobile-kit';
import { rowTime } from '@/inbox/messages/days/day-label';
import { SearchMarks } from '@/inbox/thread/search';

interface MessageHitRowProps {
  hit: MessageSearchHit;
  /** The searched words, marked in the snippet. */
  q: string;
  /** The list's one clock (useToday). */
  now: Date;
  onOpen: (hit: MessageSearchHit) => void;
  /** A teacher never sees the family's number. */
  teacher: boolean;
}

/** The chat's name; without one the number, or for a teacher no number at all. */
const nameOf = (hit: MessageSearchHit, teacher: boolean): string =>
  hit.display_name ?? (teacher ? t.inbox.unknownNumber : ltr(formatPhone(hit.phone_e164)));

/** docs/37. */
export function MessageHitRow({ hit, q, now, onOpen, teacher }: MessageHitRowProps) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const name = nameOf(hit, teacher);
  const when = rowTime(hit.created_at, cycle, { now });
  const small = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  return (
    <Pressable
      testID="message-hit"
      accessibilityRole="button"
      accessibilityLabel={`${name} · ${when} · ${hit.snippet}`}
      onPress={() => onOpen(hit)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: pressed ? color.sunk : 'transparent',
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
            {when}
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

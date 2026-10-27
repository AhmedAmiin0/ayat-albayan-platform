import { reactionPill } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface ReactionPillProps {
  message: MessageView;
  /** On the bubble's inline-end edge for ours, start for theirs (WhatsApp), so it mirrors with the language. */
  side: 'start' | 'end';
  /** A tap: who reacted (the reactors sheet). */
  onPress: () => void;
}

/** «👍 ❤️» on the bubble's bottom edge; nothing without a reaction. Two of the same read «👍 2». */
export function ReactionPill({ message: m, side, onPress }: ReactionPillProps) {
  const { color } = useTheme();
  const items = reactionPill(m.reactions);
  if (items.length === 0) return null;
  const text = items.map((i) => (i.count > 1 ? `${i.emoji} ${i.count}` : i.emoji)).join(' ');
  return (
    <Pressable
      testID={`reaction-pill-${m.id}`}
      accessibilityRole="button"
      accessibilityLabel={t.inbox.reactions.pill.replace('{list}', text)}
      onPress={onPress}
      hitSlop={10}
      style={{
        alignSelf: side === 'end' ? 'flex-end' : 'flex-start',
        marginTop: -10,
        marginHorizontal: 8,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText style={{ fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm) }}>{text}</AppText>
    </Pressable>
  );
}

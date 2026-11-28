import { bubbleWord, messageTicks, type TickKind, tickTone } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { TickGlyph } from '../TickGlyph';
import type { DeliveryTicksProps } from './DeliveryTicks.types';
import { INK, ROW, HIDDEN, plain, holdOf } from './delivery-ticks.helpers';

/** A send that may have gone (docs/19) is not called unsent. */
const statusWord = ({ status, errorCode }: DeliveryTicksProps): string =>
  bubbleWord(status, errorCode) === 'unconfirmed'
    ? t.messages.unconfirmedTick
    : t.enums.messageStatus[status];

const named = (p: DeliveryTicksProps): string =>
  p.times ? `${statusWord(p)} · ${p.times}` : statusWord(p);

const labelOf = (p: DeliveryTicksProps): string =>
  p.actionLabel ? `${named(p)} — ${p.actionLabel}` : named(p);

/** Delivered vs read differ by colour only (docs/07 principle 3 carve-out); word goes to a11y. */
export function DeliveryTicks(p: DeliveryTicksProps) {
  const { color } = useTheme();
  const kind: TickKind = messageTicks(p.status);
  const ink = color[INK[tickTone(kind)]];
  const word = bubbleWord(p.status, p.errorCode, p.inList);
  const body = <TickGlyph kind={kind} ink={ink} word={word} />;
  // A tap in a list is the row's tap: no Pressable, and hidden from the reader (the row says it).
  if (p.inList)
    return (
      <View testID={`ticks-${kind}`} style={ROW} {...HIDDEN}>
        {body}
      </View>
    );
  const a11y = {
    accessible: true,
    accessibilityRole: p.onPress ? ('button' as const) : ('image' as const),
    accessibilityLabel: labelOf(p),
    testID: `ticks-${kind}`,
    style: ROW,
  };
  if (plain(p)) return <View {...a11y}>{body}</View>;
  // hitSlop 14: the 16pt glyph is a 44pt target.
  return (
    <Pressable {...a11y} hitSlop={14} onPress={p.onPress} onLongPress={holdOf(p)}>
      {body}
    </Pressable>
  );
}

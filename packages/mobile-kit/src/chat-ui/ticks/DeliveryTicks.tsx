import {
  bubbleWord,
  type MessageStatus,
  messageTicks,
  type TickKind,
  tickTone,
  type TickTone,
} from '@ab/shared';
import { Pressable, View, type ViewStyle } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { type Palette, useTheme } from '../../theme';
import { TickGlyph } from './TickGlyph';

// Read is the WhatsApp-like blue (`read`), the rest the tick grey (`tick`); failed is saffron, the
// «دورك» tone of its chip (status-style.ts).
const INK: Record<TickTone, keyof Palette> = { muted: 'tick', read: 'read', act: 'act' };
const ROW: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 2 };
const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

export interface DeliveryTicksProps {
  /** Any chat's status: the student channel passes 'sent' / 'read' only. */
  status: MessageStatus;
  /** «أُرسلت … · وصلت … · قُرئت …»: read with the word; a long press toggles them. */
  times?: string;
  /** The bubble shows the times on its own line under the meta row. */
  onLongPress?: () => void;
  /** The row that did not go out: a tap opens what can be done, as WhatsApp. */
  onPress?: () => void;
  /** Said after the status word when it can be tapped: why it failed («السبب: …»). */
  actionLabel?: string;
  /** In a chat-list row: the row's label already says the word (no separate stop). */
  inList?: boolean;
  /** A long press of its own (the student channel's «من قرأ الرسالة») instead of the times. */
  onHold?: () => void;
  /** The row's error_code: a send that may have gone reads «لم يتأكد الإرسال بعد» (bubbleWord). */
  errorCode?: string | null;
}

/** The status word: a send that may have gone (docs/19) is not «لم تُرسل». */
const statusWord = ({ status, errorCode }: DeliveryTicksProps): string =>
  bubbleWord(status, errorCode) === 'unconfirmed'
    ? t.messages.unconfirmedTick
    : t.enums.messageStatus[status];

const named = (p: DeliveryTicksProps): string =>
  p.times ? `${statusWord(p)} · ${p.times}` : statusWord(p);

const labelOf = (p: DeliveryTicksProps): string =>
  p.actionLabel ? `${named(p)} — ${p.actionLabel}` : named(p);

const plain = (p: DeliveryTicksProps): boolean => !p.times && !p.onPress && !p.onHold;

/** The long press: the caller's own, else the times' toggle when there are times. */
const holdOf = (p: DeliveryTicksProps): (() => void) | undefined =>
  p.onHold ?? (p.times ? p.onLongPress : undefined);

/**
 * WhatsApp-style ticks on OUR message (packages/shared ticks.ts), drawn with react-native-svg: an
 * image named by the status word (+ times). As in WhatsApp, delivered vs read is the same two ticks
 * told apart by colour only (docs/07 principle 3 carve-out): the word goes to assistive tech and
 * the long press. Failed has its own «!» and word; sent by hand «يدويًا». A row with `onPress` is a
 * button instead: a tap opens its sheet (retry, by hand).
 */
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

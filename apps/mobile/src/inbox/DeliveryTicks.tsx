import {
  type MessageStatus,
  messageTicks,
  TICK_PATHS,
  tickTone,
  type TickTone,
  tickWord,
} from '@ab/shared';
import { Pressable, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/lib/i18n';
import { type Palette, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

// Read is the WhatsApp-like blue (`read`), the rest the tick grey (`tick`); failed is saffron, the
// «دورك» tone of its chip (status-style.ts).
const INK: Record<TickTone, keyof Palette> = { muted: 'tick', read: 'read', act: 'act' };
const ROW: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 2 };

export interface DeliveryTicksProps {
  status: MessageStatus;
  /** «أُرسلت … · وصلت … · قُرئت …» (deliveryTimes): read with the word; a long press toggles them. */
  times?: string;
  /** The bubble shows the times on its own line under the meta row (MessageMeta). */
  onLongPress?: () => void;
  /** In a thread row: the row's label already says the word (no separate stop), its chip «لم تُرسل». */
  inList?: boolean;
}

const WORD = { failed: t.enums.messageStatus.failed, manual: t.messages.manualTick } as const;

/**
 * WhatsApp-style ticks on OUR message (packages/shared ticks.ts), the web's DeliveryTicks drawn with
 * react-native-svg: an image named by the status word (+ times). As in WhatsApp, delivered vs read is
 * the same two ticks told apart by colour only (docs/07 principle 3 carve-out): the word goes to
 * assistive tech and the long press. Failed has its own «!» and word; sent by hand «يدويًا».
 */
export function DeliveryTicks({ status, times, onLongPress, inList = false }: DeliveryTicksProps) {
  const { color } = useTheme();
  const kind = messageTicks(status);
  const ink = color[INK[tickTone(kind)]];
  const wordKind = tickWord(kind, inList);
  const word = wordKind ? WORD[wordKind] : null;
  const body = (
    <>
      <Svg
        viewBox="0 0 20 20"
        width={16}
        height={16}
        color={ink}
        testID="ticks-glyph"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path
          d={TICK_PATHS[kind]}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {word ? (
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size['2xs'],
            lineHeight: type.lineHeight(type.size['2xs']),
            // Text needs AA, unlike the glyph: «يدويًا» in the muted text ink, «لم تُرسل» in saffron.
            color: wordKind === 'manual' ? color.ink3 : ink,
          }}
        >
          {word}
        </AppText>
      ) : null}
    </>
  );
  if (inList) {
    // A tap here is the row's tap: no Pressable, and hidden from the reader (the row says the word).
    return (
      <View testID={`ticks-${kind}`} style={ROW} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {body}
      </View>
    );
  }
  const a11y = {
    accessible: true,
    accessibilityRole: 'image' as const,
    accessibilityLabel: times ? `${t.enums.messageStatus[status]} · ${times}` : t.enums.messageStatus[status],
    testID: `ticks-${kind}`,
    style: ROW,
  };
  if (!times) return <View {...a11y}>{body}</View>;
  return (
    <Pressable {...a11y} hitSlop={14} onLongPress={onLongPress}>
      {body}
    </Pressable>
  );
}

import {
  type MessageStatus,
  messageTicks,
  TICK_PATHS,
  tickHasWord,
  tickTone,
  type TickTone,
} from '@ab/shared';
import { useState } from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/lib/i18n';
import { type Palette, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

// Read is the WhatsApp-like blue token (`read`), failed the error red, the rest the muted ink.
const INK: Record<TickTone, keyof Palette> = { muted: 'ink3', read: 'read', bad: 'bad' };

export interface DeliveryTicksProps {
  status: MessageStatus;
  /** «أُرسلت … · وصلت … · قُرئت …» (deliveryTimes): read with the word; a long press shows it. */
  times?: string;
}

/**
 * WhatsApp-style ticks on OUR message (packages/shared ticks.ts), the web's DeliveryTicks drawn with
 * react-native-svg: an image named by the status word (+ times), so nothing is colour-only.
 * Sent by hand keeps its short word «يدويًا».
 */
export function DeliveryTicks({ status, times }: DeliveryTicksProps) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const kind = messageTicks(status);
  const ink = color[INK[tickTone(kind)]];
  const word = t.enums.messageStatus[status];
  const small = {
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
  };
  return (
    <Pressable
      accessible
      accessibilityRole="image"
      accessibilityLabel={times ? `${word} · ${times}` : word}
      testID={`ticks-${kind}`}
      onLongPress={times ? () => setOpen((v) => !v) : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
    >
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
      {tickHasWord(kind) ? (
        <AppText style={{ ...small, color: ink }}>{t.messages.manualTick}</AppText>
      ) : null}
      {open && times ? <AppText style={{ ...small, color: color.ink2 }}>{times}</AppText> : null}
    </Pressable>
  );
}

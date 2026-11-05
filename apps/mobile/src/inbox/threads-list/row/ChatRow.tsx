import type { ReactNode } from 'react';
import { Pressable, View, type TextStyle, type ViewStyle } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { useInset } from '@/core/ui/surface/inset';
import { type, useTheme } from '@/theme';

interface ChatRowProps {
  /** The avatar, centred on the row's height. */
  leading: ReactNode;
  /** The name, or the LTR-isolated phone when the contact has none. */
  title: string;
  /** The title is a phone: drawn left to right. */
  titleLtr: boolean;
  /** At the far end of line 1: the last message's time. */
  time: ReactNode;
  /** Line 2: ticks or «مسوّدة:» then the preview, one line. */
  preview: ReactNode;
  /** At the far end of line 2: the unread count or the failed chip. */
  badge: ReactNode;
  /** Line 3, only when there is something to show: role · source · status · phone, one line. */
  meta?: ReactNode;
  onPress: () => void;
}

const line: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 8 };

/** The pressable row's frame: its own fill and rule unless an inset group draws them. */
function useRowStyle(): (state: { pressed: boolean }) => ViewStyle[] {
  const { color } = useTheme();
  const inset = useInset();
  const row: ViewStyle = {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...(inset
      ? null
      : { borderBottomWidth: 1, borderBottomColor: color.rule, backgroundColor: color.raised }),
  };
  const down: ViewStyle = { backgroundColor: color.sunk, opacity: 0.85 };
  return ({ pressed }) => (pressed ? [row, down] : [row]);
}

/** Line 1's name: 16sp semibold, one line, «…» at the end of its own reading direction. */
function RowTitle({ title, ltr }: { title: string; ltr: boolean }) {
  const { color } = useTheme();
  const style: TextStyle = {
    flex: 1,
    fontFamily: type.ui[600],
    fontSize: type.size.base,
    lineHeight: type.lineHeight(type.size.base),
    color: color.ink,
  };
  const phone: TextStyle = { writingDirection: 'ltr', fontVariant: ['tabular-nums'] };
  return (
    <AppText
      testID="chat-row-title"
      numberOfLines={1}
      ellipsizeMode="tail"
      style={ltr ? [style, phone] : style}
    >
      {title}
    </AppText>
  );
}

/**
 * One chat in «المحادثات» as WhatsApp's chat list (owner 2026-11-06: «enhance the look»): at most
 * three lines, the name and time, the preview and badge, then one quiet meta line. The name is a
 * Text of its own (its own bidi paragraph: a long Arabic name ellipsizes at its own end and never
 * mixes with the phone); the ends follow the reading direction, so the row mirrors with the phone.
 */
export function ChatRow(p: ChatRowProps) {
  return (
    <Pressable
      testID="chat-row"
      accessibilityRole="button"
      onPress={p.onPress}
      style={useRowStyle()}
    >
      {p.leading}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={line}>
          <RowTitle title={p.title} ltr={p.titleLtr} />
          {p.time}
        </View>
        <View style={line}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {p.preview}
          </View>
          {p.badge}
        </View>
        {p.meta}
      </View>
    </Pressable>
  );
}

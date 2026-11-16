import type { ReactNode } from 'react';
import { type GestureResponderEvent, Pressable, View, type ViewStyle } from 'react-native';
import { type Palette, shape, useTheme } from '../../theme';
import { bubbleSide } from './bubble-side';

export interface BubbleShellProps {
  /** Ours: at the inline-end, in the brand wash; theirs at the start, raised. */
  ours: boolean;
  /** Just jumped to: a brand edge for a moment. */
  highlight?: boolean;
  /** Laid over the box last (a wide template, a sticker's bare box). */
  style?: ViewStyle;
  testID?: string;
  /** The menu's long press; absent, the bubble is a plain View. */
  onLongPress?: (e: GestureResponderEvent) => void;
  children: ReactNode;
}

/** The bubble's padding (a template's button rows reach past it to the edges). */
export const BUBBLE_PAD = { x: 10, bottom: 6 } as const;

function edgeOf(ours: boolean, highlight: boolean, color: Palette): string {
  if (highlight) return color.lapis;
  return ours ? color.lapisWash : color.rule;
}

/** The box: its side, the sharp tail corner at the top of the screen-edge side, its colours. */
function useBubbleBox({ ours, highlight = false, style }: BubbleShellProps): ViewStyle {
  const { color } = useTheme();
  const side = bubbleSide(ours);
  const tail = side.outer === 'start' ? 'borderTopStartRadius' : 'borderTopEndRadius';
  return {
    alignSelf: side.align,
    maxWidth: '88%',
    gap: 4,
    paddingHorizontal: BUBBLE_PAD.x,
    paddingVertical: BUBBLE_PAD.bottom,
    borderRadius: shape.radius.lg,
    [tail]: shape.radius.xs,
    borderWidth: 1,
    borderColor: edgeOf(ours, highlight, color),
    backgroundColor: ours ? color.lapisWash : color.raised,
    ...style,
  };
}

/**
 * One chat bubble's shell, as WhatsApp (owner 2026-10-27): ours at the inline-end, theirs at the
 * start (RN mirrors them), the tail corner on the screen-edge side. The caller fills it; with
 * `onLongPress` it is a press target (350 ms) that leaves the reader's focus to its contents.
 */
export function BubbleShell(p: BubbleShellProps) {
  const box = useBubbleBox(p);
  if (!p.onLongPress)
    return (
      <View testID={p.testID} style={box}>
        {p.children}
      </View>
    );
  return (
    <Pressable
      testID={p.testID}
      accessible={false}
      onLongPress={p.onLongPress}
      delayLongPress={350}
      style={box}
    >
      {p.children}
    </Pressable>
  );
}

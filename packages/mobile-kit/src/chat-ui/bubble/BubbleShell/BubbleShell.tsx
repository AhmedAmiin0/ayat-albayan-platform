import type { ReactNode } from 'react';
import {
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type GestureResponderEvent,
  Pressable,
  View,
  type ViewStyle,
} from 'react-native';
import { type Palette, shape, useTheme } from '../../../theme';
import { bubbleSide } from '../bubble-side';

/**
 * The bubble as one stop for a screen reader (the student channel): what it says, the hint of its
 * menu and the menu as an action. Absent (the staff inbox), the reader reaches its contents.
 */
export interface BubbleA11y {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
}

export interface BubbleShellProps extends BubbleA11y {
  /** Ours: at the inline-end, in the brand wash; theirs at the start, raised. */
  ours: boolean;
  /** Just jumped to: a brand edge for a moment. */
  highlight?: boolean;
  /** The sharp corner of a group's first bubble; false for a same-sender follow-up. */
  tail?: boolean;
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
function useBubbleBox(p: BubbleShellProps): ViewStyle {
  const { ours, highlight = false, tail = true, style } = p;
  const { color } = useTheme();
  const side = bubbleSide(ours);
  const corner = side.outer === 'start' ? 'borderTopStartRadius' : 'borderTopEndRadius';
  return {
    alignSelf: side.align,
    maxWidth: '88%',
    gap: 4,
    paddingHorizontal: BUBBLE_PAD.x,
    paddingVertical: BUBBLE_PAD.bottom,
    borderRadius: shape.radius.lg,
    [corner]: tail ? shape.radius.xs : shape.radius.lg,
    borderWidth: 1,
    borderColor: edgeOf(ours, highlight, color),
    backgroundColor: ours ? color.lapisWash : color.raised,
    ...style,
  };
}

/**
 * One chat bubble's shell, as WhatsApp: ours at the inline-end, theirs at the
 * start (RN mirrors them), the tail corner on the screen-edge side. The caller fills it; with
 * `onLongPress` it is a press target (350 ms) that leaves the reader's focus to its contents,
 * unless it is given its accessibility actions (then one stop with its label, hint and menu).
 */
export function BubbleShell(p: BubbleShellProps) {
  const box = useBubbleBox(p);
  const spoken = p.accessibilityActions !== undefined;
  if (!p.onLongPress)
    return (
      <View testID={p.testID} style={box}>
        {p.children}
      </View>
    );
  return (
    <Pressable
      testID={p.testID}
      accessible={spoken}
      accessibilityLabel={p.accessibilityLabel}
      accessibilityHint={p.accessibilityHint}
      accessibilityActions={p.accessibilityActions}
      onAccessibilityAction={p.onAccessibilityAction}
      onLongPress={p.onLongPress}
      delayLongPress={350}
      style={box}
    >
      {p.children}
    </Pressable>
  );
}

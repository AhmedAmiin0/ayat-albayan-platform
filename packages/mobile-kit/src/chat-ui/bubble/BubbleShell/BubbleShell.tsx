import { Pressable, View } from 'react-native';
import type { BubbleShellProps } from './BubbleShell.types';
import { useBubbleShell } from './use-bubble-shell';

/**
 * One chat bubble's shell, as WhatsApp: ours at the inline-end, theirs at the
 * start (RN mirrors them), the tail corner on the screen-edge side. The caller fills it; with
 * `onLongPress` it is a press target (350 ms) that leaves the reader's focus to its contents,
 * unless it is given its accessibility actions (then one stop with its label, hint and menu).
 */
export function BubbleShell(p: BubbleShellProps) {
  const { box, spoken } = useBubbleShell(p);
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

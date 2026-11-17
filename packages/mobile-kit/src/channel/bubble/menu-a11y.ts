import type { AccessibilityActionEvent } from 'react-native';
import type { BubbleA11y } from '../../chat-ui/bubble/BubbleShell';
import { t } from '../../lib/i18n/i18n';

/**
 * The message menu for a screen reader (review 2026-11-17): the hint that a long press opens it,
 * and that long press as an action. Nothing when the bubble has no menu.
 */
export function menuA11y(onLongPress: (() => void) | undefined): BubbleA11y {
  if (!onLongPress) return {};
  const run: Partial<Record<string, () => void>> = { longpress: onLongPress };
  return {
    accessibilityHint: t.studentChannel.actions.menuHint,
    accessibilityActions: [{ name: 'longpress', label: t.studentChannel.actions.menu }],
    onAccessibilityAction: (e: AccessibilityActionEvent) => run[e.nativeEvent.actionName]?.(),
  };
}

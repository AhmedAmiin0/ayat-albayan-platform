import { defaultMinSize, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityHint, accessibilityLabel, frame } from '@expo/ui/swift-ui/modifiers';
import { shape } from '../../../../theme';
import { innerMinHeight } from '../field-box';

/**
 * Both platforms' modifiers in one list: @expo/ui ignores the other platform's. SwiftUI applies
 * the first modifier innermost (inside padding and border), Compose outermost, hence two heights.
 * Compose has no hint, so TalkBack hears it after the label.
 */
export function nativeModifiers(label: string, hint: string | undefined) {
  const hints = hint === undefined ? [] : [hint];
  return [
    accessibilityLabel(label),
    ...hints.map(accessibilityHint),
    frame({ minHeight: innerMinHeight }),
    semantics({ contentDescription: [label, ...hints].join('. ') }),
    defaultMinSize({ minHeight: shape.control.touch }),
  ];
}

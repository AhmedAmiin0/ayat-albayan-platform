import { View } from 'react-native';
import type { HeaderLeadingProps } from './HeaderLeading.types';

/** The chevron's 44pt box reaches the screen's start edge and hugs the title, as ChatHeader. */
export function HeaderLeading({ node }: HeaderLeadingProps) {
  return node ? <View style={{ marginStart: -10, marginEnd: -8 }}>{node}</View> : null;
}

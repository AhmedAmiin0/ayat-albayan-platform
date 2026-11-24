import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

/** docs/50 §5: a spinner beside the busy label; the button keeps its size. */
export const progressIcon = (busy: boolean): ((ink: string) => ReactNode) | undefined =>
  busy ? (ink) => <ActivityIndicator testID="button-progress" size="small" color={ink} /> : undefined;

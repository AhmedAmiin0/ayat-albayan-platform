import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

/**
 * The primary button's progress while a request runs (docs/50 §5 «Response»): a small spinner
 * beside its «جارٍ…» label, in the label's colour; the button keeps its size.
 */
export const progressIcon = (busy: boolean): ((ink: string) => ReactNode) | undefined =>
  busy ? (ink) => <ActivityIndicator testID="button-progress" size="small" color={ink} /> : undefined;

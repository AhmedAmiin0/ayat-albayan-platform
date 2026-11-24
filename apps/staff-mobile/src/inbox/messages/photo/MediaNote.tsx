import { Pressable } from 'react-native';
import { t, shape, type, AppText, useSmallText } from '@ab/mobile-kit';
import type { MediaProblem } from './media-problem';

/** A short line in place of a file the bubble cannot show. */
export function MediaNote({ text }: { text: string }) {
  const small = useSmallText();
  return (
    <AppText accessibilityRole="text" style={{ ...small, fontFamily: type.ui[600] }}>
      {text}
    </AppText>
  );
}

export function RetryLine({ onPress }: { onPress: () => void }) {
  const small = useSmallText();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLiveRegion="polite"
      onPress={onPress}
      style={{ minHeight: shape.control.touch, justifyContent: 'center' }}
    >
      <AppText style={{ ...small, fontFamily: type.ui[600] }}>{t.inbox.mediaFailed}</AppText>
    </Pressable>
  );
}

/** What the bubble says for a problem that ends there; null for one worth another try. */
export function problemText(problem: MediaProblem, kind: string): string | null {
  if (problem === 'expired') return t.inbox.mediaExpired;
  if (problem === 'forbidden') return `${kind} · ${t.inbox.mediaNotAllowed}`;
  if (problem === 'crm') return t.inbox.mediaInCrm;
  return null;
}
